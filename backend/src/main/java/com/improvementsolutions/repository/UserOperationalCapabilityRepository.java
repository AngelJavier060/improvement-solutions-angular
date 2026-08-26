package com.improvementsolutions.repository;

import com.improvementsolutions.model.UserOperationalCapability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserOperationalCapabilityRepository extends JpaRepository<UserOperationalCapability, Long> {
    Optional<UserOperationalCapability> findByUserId(Long userId);

    List<UserOperationalCapability> findByUserIdIn(Collection<Long> userIds);
}
