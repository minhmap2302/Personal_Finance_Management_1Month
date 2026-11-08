package org.example.backend.model.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.backend.model.entity.Category;
import org.example.backend.model.enums.CategoryType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CategoryResponse {

    private Long id;
    private String name;
    private CategoryType type;
    private Long familyId;
    private Boolean active;
    private Boolean system;

    public static CategoryResponse fromEntity(Category category) {
        if (category == null) {
            return null;
        }

        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .type(category.getType())
                .familyId(category.getFamily() != null ? category.getFamily().getId() : null)
                .active(category.getActive())
                .system(category.getFamily() == null)
                .build();
    }
}
