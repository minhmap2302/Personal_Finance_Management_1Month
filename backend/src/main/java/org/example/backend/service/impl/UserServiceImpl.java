package org.example.backend.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.exception.BadRequestException;
import org.example.backend.exception.ConflictException;
import org.example.backend.exception.ForbiddenException;
import org.example.backend.exception.ResourceNotFoundException;
import org.example.backend.model.dto.request.ChangePasswordRequest;
import org.example.backend.model.dto.request.DeleteAccountRequest;
import org.example.backend.model.dto.request.UpdateProfileRequest;
import org.example.backend.model.dto.response.UserResponse;
import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.FamilyRole;
import org.example.backend.model.enums.SystemRole;
import org.example.backend.repository.FamilyMemberRepository;
import org.example.backend.repository.FamilyRepository;
import org.example.backend.repository.InvitationRepository;
import org.example.backend.repository.RefreshTokenRepository;
import org.example.backend.repository.UserRepository;
import org.example.backend.service.UserService;
import org.example.backend.util.DeletedUserNaming;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final FamilyRepository familyRepository;
    private final InvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentProfile(Long userId) {
        User user = getUserById(userId);
        return UserResponse.fromEntity(user);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = getUserById(userId);

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            String newUsername = request.getUsername().trim();
            if (DeletedUserNaming.isReservedUsername(newUsername)) {
                throw new BadRequestException("Tên đăng nhập '" + newUsername + "' không được phép sử dụng");
            }
            if (userRepository.existsByUsernameAndIdNot(newUsername, userId)) {
                throw new ConflictException("Tên đăng nhập '" + newUsername + "' đã được sử dụng bởi tài khoản khác");
            }
            user.setUsername(newUsername);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            if (DeletedUserNaming.isReservedEmail(newEmail)) {
                throw new BadRequestException("Email '" + newEmail + "' không được phép sử dụng");
            }
            if (userRepository.existsByEmailAndIdNot(newEmail, userId)) {
                throw new ConflictException("Email '" + newEmail + "' đã được sử dụng bởi tài khoản khác");
            }
            user.setEmail(newEmail);
        }

        User updatedUser = userRepository.save(user);
        return UserResponse.fromEntity(updatedUser);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = getUserById(userId);

        // 1. Kiểm tra mật khẩu hiện tại có chính xác không
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }

        // 2. Kiểm tra xác nhận mật khẩu mới có trùng khớp không
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Xác nhận mật khẩu mới không trùng khớp");
        }

        // 3. Kiểm tra mật khẩu mới không trùng mật khẩu hiện tại
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        // 4. Mã hóa mật khẩu mới và lưu
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // 5. Chính sách bảo mật: thu hồi tất cả refresh token của các phiên khác
        refreshTokenRepository.revokeAllByUser(user);
        log.info("Đã đổi mật khẩu thành công và thu hồi tất cả refresh token cho user ID: {}", userId);
    }

    /**
     * Xóa tài khoản: không xóa dòng users mà ẩn danh hóa (giao dịch, mục tiêu tiết kiệm, khoản đóng góp
     * vẫn tham chiếu đến user và thuộc về gia đình nên phải được giữ lại).
     * Chạy ở READ_COMMITTED vì khóa dòng gia đình, giống các thao tác đổi thành viên khác.
     */
    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteAccount(Long userId, DeleteAccountRequest request) {
        User user = getUserById(userId);

        if (user.isDeleted()) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId);
        }
        if (user.getRole() == SystemRole.ADMIN) {
            throw new ForbiddenException("Tài khoản quản trị không thể tự xóa");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu không chính xác");
        }

        // 1. Xóa mọi lời mời liên quan (đã gửi và đã nhận). Làm trước để đợi các lệnh chấp nhận đang chạy
        //    (chúng khóa dòng lời mời) và để lệnh chấp nhận đến sau nhận 404.
        invitationRepository.deleteAllInvolving(userId);

        // 2. Khóa các gia đình của người này theo thứ tự id tăng dần (hai lần xóa cùng lúc không khóa chéo nhau).
        //    Thao tác chuyển quyền khóa đúng một gia đình nên không chen vào giữa được. Chỉ lấy id (chưa nạp
        //    FamilyMember) để đọc vai trò sau khi khóa, không dùng dữ liệu cũ.
        for (Long familyId : familyMemberRepository.findFamilyIdsByUserId(userId)) {
            familyRepository.findByIdForUpdate(familyId);
        }

        // 3. Chủ gia đình phải chuyển quyền hoặc xóa gia đình trước, không để gia đình mất chủ.
        List<FamilyMember> memberships = familyMemberRepository.findByUserIdOrderByJoinedAtAsc(userId);
        List<String> ownedFamilies = memberships.stream()
                .filter(m -> m.getRole() == FamilyRole.OWNER)
                .map(m -> m.getFamily().getName())
                .toList();
        if (!ownedFamilies.isEmpty()) {
            throw new ConflictException("Bạn đang là chủ của gia đình: " + String.join(", ", ownedFamilies)
                    + ". Hãy chuyển quyền hoặc xóa gia đình trước khi xóa tài khoản");
        }

        // 4. Rời mọi gia đình. Giao dịch của người này vẫn được giữ lại.
        familyMemberRepository.deleteAll(memberships);

        // 5. Xóa hẳn refresh token (không chỉ thu hồi: token đã thu hồi mà bị gửi lại sẽ bị coi là bị đánh cắp
        //    và kích hoạt cảnh báo an ninh).
        refreshTokenRepository.deleteAllByUserId(userId);

        // 6. Ẩn danh hóa. Đổi username khiến access token cũ không còn tìm được người dùng, enabled = false
        //    chặn đăng nhập, mật khẩu ngẫu nhiên không ai biết.
        user.setUsername(DeletedUserNaming.username(userId));
        user.setEmail(DeletedUserNaming.email(userId));
        user.setFullName(DeletedUserNaming.DISPLAY_NAME);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setEnabled(false);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);

        log.info("Người dùng ID {} đã xóa tài khoản", userId);
    }

    private User getUserById(Long userId) {
        if (userId == null) {
            throw new BadRequestException("ID người dùng không hợp lệ");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
    }
}