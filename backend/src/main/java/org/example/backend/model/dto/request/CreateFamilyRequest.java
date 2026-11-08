package org.example.backend.model.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Yêu cầu tạo gia đình. Người tạo trở thành chủ gia đình.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateFamilyRequest {

    @NotBlank(message = "Tên gia đình không được để trống")
    @Size(max = 100, message = "Tên gia đình tối đa 100 ký tự")
    private String name;
}