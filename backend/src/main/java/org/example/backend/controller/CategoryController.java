package org.example.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.exception.UnauthorizedException;
import org.example.backend.model.dto.request.CreateCategoryRequest;
import org.example.backend.model.dto.request.UpdateCategoryRequest;
import org.example.backend.model.dto.response.ApiResponse;
import org.example.backend.model.dto.response.CategoryResponse;
import org.example.backend.model.entity.User;
import org.example.backend.model.enums.CategoryType;
import org.example.backend.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) Long familyId,
            @RequestParam(required = false) CategoryType type,
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(defaultValue = "false") boolean includeArchived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        List<CategoryResponse> data = categoryService.getCategories(
                currentUser, familyId, keyword, type, includeArchived, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách danh mục thành công", data));
    }

    @PostMapping("/system")
    public ResponseEntity<ApiResponse<CategoryResponse>> createSystemCategory(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateCategoryRequest request) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        CategoryResponse data = categoryService.createSystemCategory(currentUser, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục hệ thống thành công", data));
    }

    @PostMapping("/families/{familyId}")
    public ResponseEntity<ApiResponse<CategoryResponse>> createFamilyCategory(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long familyId,
            @Valid @RequestBody CreateCategoryRequest request) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        CategoryResponse data = categoryService.createFamilyCategory(currentUser, familyId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục gia đình thành công", data));
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long categoryId,
            @RequestParam(required = false) Long familyId,
            @Valid @RequestBody UpdateCategoryRequest request) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        CategoryResponse data = categoryService.updateCategory(currentUser, categoryId, familyId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục thành công", data));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long categoryId,
            @RequestParam(required = false) Long familyId) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        categoryService.deleteCategory(currentUser, categoryId, familyId);
        return ResponseEntity.ok(ApiResponse.success("Xóa danh mục thành công"));
    }

    @PatchMapping("/{categoryId}/restore")
    public ResponseEntity<ApiResponse<CategoryResponse>> restoreCategory(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long categoryId,
            @RequestParam(required = false) Long familyId) {
        if (currentUser == null) {
            throw new UnauthorizedException("Bạn chưa đăng nhập");
        }

        CategoryResponse data = categoryService.restoreCategory(currentUser, categoryId, familyId);
        return ResponseEntity.ok(ApiResponse.success("Khôi phục danh mục thành công", data));
    }
}
