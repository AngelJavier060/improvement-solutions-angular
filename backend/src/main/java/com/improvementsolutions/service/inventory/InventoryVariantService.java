package com.improvementsolutions.service.inventory;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventoryProduct;
import com.improvementsolutions.model.inventory.InventoryVariant;
import com.improvementsolutions.model.inventory.enums.VariantStatus;
import com.improvementsolutions.repository.inventory.InventoryProductRepository;
import com.improvementsolutions.repository.inventory.InventoryVariantRepository;

@Service
public class InventoryVariantService {

    private final InventoryVariantRepository variantRepository;
    private final InventoryProductRepository productRepository;
    private final InventoryAuthorizationService authService;

    public InventoryVariantService(
            InventoryVariantRepository variantRepository,
            InventoryProductRepository productRepository,
            InventoryAuthorizationService authService) {
        this.variantRepository = variantRepository;
        this.productRepository = productRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<InventoryVariant> listByProduct(String ruc, Long productId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        if (!product.getBusiness().getId().equals(business.getId())) {
            throw new IllegalArgumentException("El producto no pertenece a la empresa");
        }
        return variantRepository.findByProduct_Id(productId);
    }

    @Transactional(readOnly = true)
    public InventoryVariant getById(String ruc, Long variantId) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryVariant variant = variantRepository.findById(variantId)
            .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
        if (!variant.getProduct().getBusiness().getId().equals(business.getId())) {
            throw new IllegalArgumentException("La variante no pertenece a la empresa");
        }
        return variant;
    }

    @Transactional
    public InventoryVariant create(String ruc, Long productId, InventoryVariant input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        if (!product.getBusiness().getId().equals(business.getId())) {
            throw new IllegalArgumentException("El producto no pertenece a la empresa");
        }
        if (input.getCode() == null || input.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("El código de la variante es obligatorio");
        }
        if (variantRepository.existsByProduct_IdAndCode(productId, input.getCode().trim())) {
            throw new IllegalArgumentException("Ya existe una variante con ese código para el producto");
        }
        InventoryVariant entity = new InventoryVariant();
        entity.setProduct(product);
        entity.setCode(input.getCode().trim());
        entity.setDescription(input.getDescription());
        entity.setSizeLabel(input.getSizeLabel());
        entity.setDimensions(input.getDimensions());
        entity.setMinQty(input.getMinQty());
        entity.setLocation(input.getLocation());
        entity.setImage(input.getImage());
        entity.setSalePrice(input.getSalePrice());
        entity.setStatus(input.getStatus() != null ? input.getStatus() : VariantStatus.ACTIVO);
        return variantRepository.save(entity);
    }

    @Transactional
    public InventoryVariant update(String ruc, Long productId, Long variantId, InventoryVariant input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct product = productRepository.findById(productId)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        if (!product.getBusiness().getId().equals(business.getId())) {
            throw new IllegalArgumentException("El producto no pertenece a la empresa");
        }
        InventoryVariant entity = variantRepository.findByIdAndProduct_Id(variantId, productId)
            .orElseThrow(() -> new IllegalArgumentException("Variante no encontrada"));
        if (input.getCode() != null && !input.getCode().trim().isEmpty()) {
            String newCode = input.getCode().trim();
            if (!newCode.equals(entity.getCode()) && variantRepository.existsByProduct_IdAndCode(productId, newCode)) {
                throw new IllegalArgumentException("Ya existe una variante con ese código para el producto");
            }
            entity.setCode(newCode);
        }
        entity.setDescription(input.getDescription());
        entity.setSizeLabel(input.getSizeLabel());
        entity.setDimensions(input.getDimensions());
        entity.setMinQty(input.getMinQty());
        entity.setLocation(input.getLocation());
        entity.setImage(input.getImage());
        if (input.getSalePrice() != null) entity.setSalePrice(input.getSalePrice());
        if (input.getStatus() != null) entity.setStatus(input.getStatus());
        return variantRepository.save(entity);
    }
}
