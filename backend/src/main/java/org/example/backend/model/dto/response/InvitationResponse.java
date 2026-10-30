package org.example.backend.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.model.enums.InvitationStatus;

import java.time.LocalDateTime;

/**
 * Thông tin một lời mời vào gia đình.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationResponse {

    private Long id;
    private Long familyId;
    private String familyName;

    /** Người được mời. */
    private String invitedUsername;

    /** Người gửi lời mời. */
    private String invitedByUsername;
    private String invitedByFullName;

    private InvitationStatus status;
    private LocalDateTime createdAt;
}