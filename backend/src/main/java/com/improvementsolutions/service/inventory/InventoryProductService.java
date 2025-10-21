package com.improvementsolutions.service.inventory;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.InventoryProduct;
import com.improvementsolutions.model.inventory.InventorySupplier;
import com.improvementsolutions.model.inventory.enums.ProductStatus;
import com.improvementsolutions.repository.inventory.InventoryProductRepository;
import com.improvementsolutions.repository.inventory.InventorySupplierRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
public class InventoryProductService {

    private final InventoryProductRepository productRepository;
    private final InventorySupplierRepository supplierRepository;
    private final InventoryAuthorizationService authService;
    @PersistenceContext
    private EntityManager em;

    public InventoryProductService(
            InventoryProductRepository productRepository,
            InventorySupplierRepository supplierRepository,
            InventoryAuthorizationService authService) {
        this.productRepository = productRepository;
        this.supplierRepository = supplierRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public List<InventoryProduct> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return productRepository.findByBusiness_Id(business.getId());
    }

    /**
     * Fallback de solo lectura para listar productos cuando aún no existen todas
     * las columnas nuevas en la BD. Selecciona únicamente columnas antiguas.
     */
    @Transactional(readOnly = true)
    public List<InventoryProduct> listLight(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        String sql = "SELECT id, code, category, name, description, unit_of_measure, image, status, min_stock "
                   + "FROM inventory_products WHERE business_id = :bid ORDER BY id DESC";
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
            .setParameter("bid", business.getId())
            .getResultList();
        List<InventoryProduct> out = new ArrayList<>();
        for (Object[] row : rows) {
            InventoryProduct p = new InventoryProduct();
            p.setId(((Number) row[0]).longValue());
            p.setCode((String) row[1]);
            p.setCategory((String) row[2]);
            p.setName((String) row[3]);
            p.setDescription((String) row[4]);
            p.setUnitOfMeasure((String) row[5]);
            p.setImage((String) row[6]);
            String status = (String) row[7];
            if (status != null) {
                try { p.setStatus(ProductStatus.valueOf(status)); } catch (Exception ignore) {}
            }
            if (row[8] != null) p.setMinStock(((Number) row[8]).intValue());
            out.add(p);
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Optional<InventoryProduct> getById(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        return productRepository.findByBusiness_RucAndId(ruc, id);
    }

    @Transactional
    public InventoryProduct create(String ruc, InventoryProduct input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);

        if (input.getCode() == null || input.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("El código del producto es obligatorio");
        }
        if (input.getName() == null || input.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del producto es obligatorio");
        }
        if (input.getCategory() == null) {
            throw new IllegalArgumentException("La categoría del producto es obligatoria");
        }
        if (productRepository.existsByBusiness_IdAndCode(business.getId(), input.getCode().trim())) {
            throw new IllegalArgumentException("Ya existe un producto con ese código en la empresa");
        }

        InventoryProduct entity = new InventoryProduct();
        entity.setBusiness(business);
        entity.setCode(input.getCode().trim());
        entity.setCategory(input.getCategory());
        entity.setName(input.getName().trim());
        entity.setDescription(input.getDescription());
        entity.setUnitOfMeasure(input.getUnitOfMeasure());
        entity.setBrand(input.getBrand());
        entity.setModel(input.getModel());
        entity.setSpecsJson(input.getSpecsJson());
        entity.setCertificationsJson(input.getCertificationsJson());
        entity.setImage(input.getImage());
        entity.setStatus(input.getStatus() != null ? input.getStatus() : ProductStatus.ACTIVO);
        entity.setMinStock(input.getMinStock());

        if (input.getSupplier() != null && input.getSupplier().getId() != null) {
            InventorySupplier sup = supplierRepository.findById(input.getSupplier().getId())
                .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado"));
            if (!sup.getBusiness().getId().equals(business.getId())) {
                throw new IllegalArgumentException("El proveedor no pertenece a la empresa");
            }
            entity.setSupplier(sup);
        }

        return productRepository.save(entity);
    }

    @Transactional
    public InventoryProduct update(String ruc, Long id, InventoryProduct input) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct entity = productRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));

        if (input.getCode() != null && !input.getCode().trim().isEmpty()) {
            String newCode = input.getCode().trim();
            if (!newCode.equals(entity.getCode()) && productRepository.existsByBusiness_IdAndCode(business.getId(), newCode)) {
                throw new IllegalArgumentException("Ya existe un producto con ese código en la empresa");
            }
            entity.setCode(newCode);
        }
        if (input.getName() != null) entity.setName(input.getName().trim());
        if (input.getCategory() != null) entity.setCategory(input.getCategory());
        entity.setDescription(input.getDescription());
        entity.setUnitOfMeasure(input.getUnitOfMeasure());
        if (input.getBrand() != null) entity.setBrand(input.getBrand());
        if (input.getModel() != null) entity.setModel(input.getModel());
        if (input.getSpecsJson() != null) entity.setSpecsJson(input.getSpecsJson());
        if (input.getCertificationsJson() != null) entity.setCertificationsJson(input.getCertificationsJson());
        entity.setImage(input.getImage());
        if (input.getStatus() != null) entity.setStatus(input.getStatus());
        entity.setMinStock(input.getMinStock());

        if (input.getSupplier() != null && input.getSupplier().getId() != null) {
            InventorySupplier sup = supplierRepository.findById(input.getSupplier().getId())
                .orElseThrow(() -> new IllegalArgumentException("Proveedor no encontrado"));
            if (!sup.getBusiness().getId().equals(business.getId())) {
                throw new IllegalArgumentException("El proveedor no pertenece a la empresa");
            }
            entity.setSupplier(sup);
        } else if (input.getSupplier() == null) {
            entity.setSupplier(null);
        }

        return productRepository.save(entity);
    }

    @Transactional
    public void softDelete(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct entity = productRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));
        entity.setStatus(ProductStatus.INACTIVO);
        productRepository.save(entity);
    }

    /**
     * Elimina un producto según su estado:
     * - Si está ACTIVO, se marca como INACTIVO (borrado lógico)
     * - Si ya está INACTIVO, se elimina físicamente (borrado definitivo)
     */
    @Transactional
    public void delete(String ruc, Long id) {
        authService.requireBusinessForRucAndCurrentUser(ruc);
        InventoryProduct entity = productRepository.findByBusiness_RucAndId(ruc, id)
            .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));

        if (entity.getStatus() == ProductStatus.INACTIVO) {
            productRepository.delete(entity);
        } else {
            entity.setStatus(ProductStatus.INACTIVO);
            productRepository.save(entity);
        }
    }
}
