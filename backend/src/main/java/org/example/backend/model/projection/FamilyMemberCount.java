package org.example.backend.model.projection;

/** Số thành viên của một gia đình. */
public interface FamilyMemberCount {
        Long getFamilyId();

        long getMemberCount();
    }