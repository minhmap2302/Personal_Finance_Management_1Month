package org.example.backend.repository;

import jakarta.persistence.LockModeType;
import org.example.backend.model.entity.Family;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FamilyRepository extends JpaRepository<Family, Long> {

    /**
     * Khóa dòng gia đình (SELECT ... FOR UPDATE) để các thao tác ghi ngân sách của cùng một gia đình
     * chạy lần lượt, tránh hai yêu cầu đồng thời cùng vượt qua bước kiểm tra chồng lấn hoặc kiểm tra tổng.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from Family f where f.id = :id")
    Optional<Family> findByIdForUpdate(@Param("id") Long id);
}