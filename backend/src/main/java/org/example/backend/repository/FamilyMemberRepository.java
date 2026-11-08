package org.example.backend.repository;

import org.example.backend.model.entity.FamilyMember;
import org.example.backend.model.projection.FamilyMemberCount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {

    Optional<FamilyMember> findByUserIdAndFamilyId(Long userId, Long familyId);

    boolean existsByUserIdAndFamilyId(Long userId, Long familyId);

    long countByFamilyId(Long familyId);

    /** Các gia đình mà người dùng tham gia, theo thứ tự tham gia. */
    @EntityGraph(attributePaths = "family")
    List<FamilyMember> findByUserIdOrderByJoinedAtAsc(Long userId);

    @Query("select m.family.id as familyId, count(m) as memberCount from FamilyMember m "
            + "where m.family.id in :familyIds group by m.family.id")
    List<FamilyMemberCount> countMembersByFamilyIds(@Param("familyIds") Collection<Long> familyIds);

    /**
     * Danh sách thành viên của gia đình, tìm theo tên đăng nhập hoặc họ tên.
     * keyword đã được chuyển về chữ thường, rỗng nghĩa là lấy tất cả.
     */
    @Query(value = "select m from FamilyMember m join fetch m.user u "
            + "where m.family.id = :familyId "
            + "and (lower(u.username) like concat('%', :keyword, '%') "
            + "or lower(u.fullName) like concat('%', :keyword, '%'))",
            countQuery = "select count(m) from FamilyMember m join m.user u "
                    + "where m.family.id = :familyId "
                    + "and (lower(u.username) like concat('%', :keyword, '%') "
                    + "or lower(u.fullName) like concat('%', :keyword, '%'))")
    Page<FamilyMember> searchMembers(@Param("familyId") Long familyId,
                                     @Param("keyword") String keyword,
                                     Pageable pageable);
}