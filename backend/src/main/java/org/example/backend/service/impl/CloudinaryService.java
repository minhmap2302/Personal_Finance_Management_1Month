package org.example.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.example.backend.exception.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Tải ảnh lên Cloudinary. Chỉ nhận ảnh JPEG, PNG, WebP.
 * Tải lên với resource_type "image" nên Cloudinary cũng từ chối mọi file không phải ảnh.
 */
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private static final List<String> ALLOWED_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    /** Dung lượng tối đa của một ảnh (10 MB). */
    private static final long MAX_SIZE = 10L * 1024 * 1024;

    private final Cloudinary cloudinary;

    /**
     * Kiểm tra và tải ảnh lên Cloudinary.
     *
     * @param folder thư mục trên Cloudinary, ví dụ "receipts/12"
     * @return đường dẫn https của ảnh (secure_url)
     */
    public String upload(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }
        // Content-Type có thể thiếu: List.of(...).contains(null) sẽ ném NullPointerException (lỗi 500), nên kiểm tra null trước.
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BadRequestException("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BadRequestException("File không được vượt quá 10MB");
        }

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap("resource_type", "image", "folder", folder));
            String url = (String) result.get("secure_url");
            if (url == null) {
                // Không được trả null: nơi gọi sẽ ghi null vào cột receipt_image và báo thành công.
                throw new RuntimeException("Tải file lên thất bại");
            }
            return url;
        } catch (IOException e) {
            throw new RuntimeException("Tải file lên thất bại", e);
        }
    }
}