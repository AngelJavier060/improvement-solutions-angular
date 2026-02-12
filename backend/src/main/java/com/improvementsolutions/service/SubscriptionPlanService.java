package com.improvementsolutions.service;

import com.improvementsolutions.model.SubscriptionPlan;
import com.improvementsolutions.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubscriptionPlanService {

    private final SubscriptionPlanRepository planRepository;

    public List<SubscriptionPlan> findAll() {
        return planRepository.findAllByOrderByDisplayOrderAsc();
    }

    public List<SubscriptionPlan> findActive() {
        return planRepository.findByActiveTrueOrderByDisplayOrderAsc();
    }

    public Optional<SubscriptionPlan> findById(Long id) {
        return planRepository.findById(id);
    }

    public Optional<SubscriptionPlan> findByCode(String code) {
        return planRepository.findByCode(code);
    }

    @Transactional
    public SubscriptionPlan create(SubscriptionPlan plan) {
        if (planRepository.findByCode(plan.getCode()).isPresent()) {
            throw new RuntimeException("Ya existe un plan con el código: " + plan.getCode());
        }
        return planRepository.save(plan);
    }

    @Transactional
    public SubscriptionPlan update(Long id, SubscriptionPlan planDetails) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan no encontrado"));

        plan.setName(planDetails.getName());
        plan.setDescription(planDetails.getDescription());
        plan.setDurationMonths(planDetails.getDurationMonths());
        plan.setPrice(planDetails.getPrice());
        plan.setCurrency(planDetails.getCurrency());
        plan.setActive(planDetails.getActive());
        plan.setDisplayOrder(planDetails.getDisplayOrder());

        return planRepository.save(plan);
    }

    @Transactional
    public void delete(Long id) {
        planRepository.deleteById(id);
    }
}
