package com.improvementsolutions.service;

import com.improvementsolutions.model.MetodologiaRiesgo;
import com.improvementsolutions.model.ParametroMetodologia;
import com.improvementsolutions.repository.MetodologiaRiesgoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class MetodologiaRiesgoService {

    private final MetodologiaRiesgoRepository repository;

    @Autowired
    public MetodologiaRiesgoService(MetodologiaRiesgoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<MetodologiaRiesgo> listAllForPublic() {
        List<MetodologiaRiesgo> list = repository.findAllWithParametros();
        // Inicializar niveles para evitar LazyInitializationException con open-in-view=false
        if (list != null) {
            for (MetodologiaRiesgo m : list) {
                if (m.getParametros() != null) {
                    for (ParametroMetodologia p : m.getParametros()) {
                        if (p.getNiveles() != null) {
                            p.getNiveles().size();
                        }
                    }
                }
            }
        }
        return list;
    }

    @Transactional(readOnly = true)
    public Optional<MetodologiaRiesgo> getByIdForPublic(Long id) {
        Optional<MetodologiaRiesgo> opt = repository.findByIdWithParametros(id);
        opt.ifPresent(m -> {
            if (m.getParametros() != null) {
                for (ParametroMetodologia p : m.getParametros()) {
                    if (p.getNiveles() != null) {
                        p.getNiveles().size();
                    }
                }
            }
        });
        return opt;
    }
}
