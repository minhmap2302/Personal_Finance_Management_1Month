package org.example.backend.service;

import org.example.backend.model.dto.request.CreateFamilyRequest;
import org.example.backend.model.dto.request.UpdateFamilyRequest;
import org.example.backend.model.dto.response.FamilyResponse;

import java.util.List;

/**
 * Nghiệp vụ gia đình: tạo, xem, đổi tên, xóa.
 */
public interface FamilyService {

    /** Tạo gia đình, người tạo trở thành chủ gia đình. */
    FamilyResponse createFamily(Long userId, CreateFamilyRequest request);

    /** Các gia đình người dùng tham gia, kèm vai trò của họ trong từng gia đình. */
    List<FamilyResponse> getMyFamilies(Long userId);

    FamilyResponse getFamily(Long userId, Long familyId);

    /** Chủ gia đình và quản lý được đổi tên. */
    FamilyResponse updateFamilyName(Long userId, Long familyId, UpdateFamilyRequest request);

    /** Chỉ chủ gia đình được xóa. Xóa toàn bộ dữ liệu của gia đình. */
    void deleteFamily(Long userId, Long familyId);
}