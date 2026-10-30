package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Kết quả tìm người dùng để mời. Chỉ trả thông tin tối thiểu, không có email.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchResponse {

    private Long userId;
    private String username;
    private String fullName;

    /** true nếu gia đình đã gửi lời mời cho người này và đang chờ phản hồi. */
    private boolean alreadyInvited;
}