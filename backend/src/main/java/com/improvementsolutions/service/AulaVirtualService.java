package com.improvementsolutions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.User;
import com.improvementsolutions.model.aula.AulaCurso;
import com.improvementsolutions.model.aula.AulaOpcion;
import com.improvementsolutions.model.aula.AulaPregunta;
import com.improvementsolutions.model.aula.AulaResultado;
import com.improvementsolutions.repository.AulaCursoRepository;
import com.improvementsolutions.repository.AulaOpcionRepository;
import com.improvementsolutions.repository.AulaPreguntaRepository;
import com.improvementsolutions.repository.AulaResultadoRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AulaVirtualService {

    private final AulaCursoRepository cursoRepository;
    private final AulaPreguntaRepository preguntaRepository;
    private final AulaOpcionRepository opcionRepository;
    private final AulaResultadoRepository resultadoRepository;
    private final BusinessEmployeeRepository employeeRepository;
    private final UserService userService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Long businessId, Authentication auth) {
        assertGestiona(auth, businessId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (AulaCurso curso : cursoRepository.findByBusinessIdOrderByCreatedAtDesc(businessId)) {
            out.add(detalleAdmin(curso));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> crear(Long businessId, String json, MultipartFile video, MultipartFile pdf, Authentication auth) {
        assertGestiona(auth, businessId);
        JsonNode body = read(json);
        String titulo = text(body, "titulo");
        if (titulo.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe el nombre de la capacitación.");
        String instructor = text(body, "instructor");
        if (instructor.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe el nombre del instructor.");
        boolean charla = "charla".equals(text(body, "modalidad"));
        boolean enVivo = charla || body.path("enVivo").asBoolean(false);
        boolean reunion = enVivo || body.path("reunion").asBoolean(false);
        String audiencia = text(body, "audiencia");
        if (audiencia.isBlank()) audiencia = "Todo el personal";
        String detalle = text(body, "audienciaDetalle");
        validarAudiencia(businessId, audiencia, detalle);

        List<JsonNode> preguntas = new ArrayList<>();
        if (body.path("preguntas").isArray()) body.path("preguntas").forEach(preguntas::add);
        int porTrabajador = Math.max(1, body.path("porTrabajador").asInt(5));
        if (!enVivo && (video == null || video.isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sube el video de la capacitación.");
        }
        Integer cupo = null;
        LocalDateTime hora = null;
        if (reunion) {
            int pedido = body.path("cupo").asInt(0);
            cupo = pedido > 0 ? pedido : null;
            hora = dateTime(text(body, "hora"));
            if (hora == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica la fecha y la hora de la reunión.");
        }

        AulaCurso curso = new AulaCurso();
        curso.setBusinessId(businessId);
        curso.setTitulo(titulo);
        curso.setInstructor(instructor);
        curso.setArea(text(body, "area").isBlank() ? "Seguridad" : text(body, "area"));
        curso.setAudiencia(audiencia);
        curso.setAudienciaDetalle(detalle.isBlank() ? null : detalle);
        curso.setFechaInicio(date(text(body, "inicio")));
        LocalDateTime horaLimite = dateTime(text(body, "horaLimite"));
        if (horaLimite == null) horaLimite = dateTime(text(body, "limite"));
        curso.setHoraLimite(horaLimite);
        curso.setFechaLimite(horaLimite != null ? horaLimite.toLocalDate() : date(text(body, "limite")));
        curso.setHoraReunion(reunion ? hora : null);
        curso.setCupo(reunion ? cupo : null);
        curso.setEnVivo(enVivo);
        curso.setTipo(charla ? "charla" : (enVivo ? "vivo" : "video"));
        curso.setNotaMinima(body.path("notaMinima").asInt(80));
        curso.setIntentos(Math.max(1, body.path("intentos").asInt(2)));
        curso.setMinutosEvaluacion(Math.max(1, body.path("minutosEvaluacion").asInt(10)));
        curso.setPorTrabajador(Math.max(1, porTrabajador));
        curso.setEstado("PUBLICADO");
        curso.setCreatedAt(LocalDateTime.now());
        curso = cursoRepository.save(curso);
        if (reunion) {
            curso.setSala("ImprovementSolutions" + businessId + "c" + curso.getId());
        }
        if (video != null && !video.isEmpty()) {
            curso.setVideoNombre(video.getOriginalFilename());
            curso.setVideoPath(guardar(businessId, video, "video"));
        }
        if (pdf != null && !pdf.isEmpty()) {
            String nombre = pdf.getOriginalFilename() == null ? "" : pdf.getOriginalFilename().toLowerCase();
            if (!nombre.endsWith(".pdf")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La presentación debe ser un PDF.");
            curso.setMaterialNombre(pdf.getOriginalFilename());
            curso.setMaterialPath(guardar(businessId, pdf, "pdf"));
        }
        cursoRepository.save(curso);
        guardarPreguntas(curso.getId(), preguntas);
        return detalleAdmin(curso);
    }

    @Transactional
    public Map<String, Object> cambiarLimite(Long businessId, Long cursoId, String horaLimite, Authentication auth) {
        assertGestiona(auth, businessId);
        AulaCurso curso = cursoDeEmpresa(businessId, cursoId);
        LocalDateTime hora = dateTime(horaLimite);
        if (hora == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique la nueva fecha y hora límite.");
        }
        curso.setHoraLimite(hora);
        curso.setFechaLimite(hora.toLocalDate());
        cursoRepository.save(curso);
        return detalleAdmin(curso);
    }

    @Transactional
    public Map<String, Object> cambiarInstructor(Long businessId, Long cursoId, String instructor, Authentication auth) {
        assertGestiona(auth, businessId);
        AulaCurso curso = cursoDeEmpresa(businessId, cursoId);
        String nombre = instructor == null ? "" : instructor.trim();
        if (nombre.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escribe el nombre del instructor.");
        }
        if (nombre.length() > 120) nombre = nombre.substring(0, 120);
        curso.setInstructor(nombre);
        cursoRepository.save(curso);
        return detalleAdmin(curso);
    }

    @Transactional
    public Map<String, Object> reemplazarPreguntas(Long businessId, Long cursoId, Object preguntasBody, Authentication auth) {
        assertGestiona(auth, businessId);
        AulaCurso curso = cursoDeEmpresa(businessId, cursoId);
        JsonNode nodo = objectMapper.valueToTree(preguntasBody);
        List<JsonNode> preguntas = new ArrayList<>();
        if (nodo != null && nodo.isArray()) nodo.forEach(preguntas::add);
        if (preguntas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo no trae preguntas.");
        }
        for (AulaPregunta pregunta : preguntaRepository.findByCursoIdOrderByOrdenAsc(curso.getId())) {
            opcionRepository.deleteByPreguntaId(pregunta.getId());
        }
        preguntaRepository.deleteByCursoId(curso.getId());
        guardarPreguntas(curso.getId(), preguntas);
        return detalleAdmin(cursoRepository.findById(curso.getId()).orElseThrow());
    }

    @Transactional
    public void eliminar(Long businessId, Long cursoId, Authentication auth) {
        assertGestiona(auth, businessId);
        AulaCurso curso = cursoDeEmpresa(businessId, cursoId);
        for (AulaPregunta pregunta : preguntaRepository.findByCursoIdOrderByOrdenAsc(curso.getId())) {
            opcionRepository.deleteByPreguntaId(pregunta.getId());
        }
        preguntaRepository.deleteByCursoId(curso.getId());
        resultadoRepository.deleteByCursoId(curso.getId());
        cursoRepository.delete(curso);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> misCursos(Authentication auth) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (BusinessEmployee empleado : empleadosActivos(auth)) {
            if (empleado.getBusiness() == null) continue;
            Long businessId = empleado.getBusiness().getId();
            for (AulaCurso curso : cursoRepository.findByBusinessIdOrderByCreatedAtDesc(businessId)) {
                if (!coincide(curso, empleado)) continue;
                out.add(vistaTrabajador(curso, empleado));
            }
        }
        return out;
    }

    @Transactional
    public Map<String, Object> iniciarEvaluacion(Long cursoId, Authentication auth) {
        BusinessEmployee empleado = empleadoDelCurso(cursoId, auth);
        AulaCurso curso = cursoRepository.findById(cursoId).orElseThrow();
        exigirVigente(curso);
        AulaResultado resultado = resultadoRepository.findByCursoIdAndEmployeeId(cursoId, empleado.getId())
                .orElseGet(() -> nuevoResultado(curso, empleado));
        if (resultado.getPreguntasJson() == null) {
            resultado.setPreguntasJson(asignarPreguntas(curso, empleado.getId()));
            resultadoRepository.save(resultado);
        }
        return Map.of("preguntas", preguntasSinRespuesta(resultado.getPreguntasJson()));
    }

    @Transactional
    public Map<String, Object> responder(Long cursoId, List<Integer> selecciones, Authentication auth) {
        BusinessEmployee empleado = empleadoDelCurso(cursoId, auth);
        AulaCurso curso = cursoRepository.findById(cursoId).orElseThrow();
        exigirVigente(curso);
        AulaResultado resultado = resultadoRepository.findByCursoIdAndEmployeeId(cursoId, empleado.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Primero debe terminar el video."));
        if (resultado.getPreguntasJson() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esta capacitación no tiene evaluación asignada.");
        }
        int usados = resultado.getIntentosUsados() == null ? 0 : resultado.getIntentosUsados();
        if (usados >= curso.getIntentos()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ya usó todos los intentos.");
        }
        List<JsonNode> preguntas = readList(resultado.getPreguntasJson());
        int buenas = 0;
        for (int i = 0; i < preguntas.size(); i++) {
            int marcada = selecciones != null && i < selecciones.size() && selecciones.get(i) != null ? selecciones.get(i) : -1;
            if (marcada == preguntas.get(i).path("correcta").asInt(-2)) buenas++;
        }
        int nota = preguntas.isEmpty() ? 0 : Math.round(buenas * 100f / preguntas.size());
        resultado.setNota(nota);
        resultado.setIntentosUsados(usados + 1);
        resultado.setEstado(nota >= curso.getNotaMinima() ? "CUMPLIO" : "NO_ALCANZO");
        resultado.setFecha(LocalDateTime.now());
        resultado.setRespuestasJson(String.valueOf(selecciones));
        resultadoRepository.save(resultado);
        int permitidos = curso.getIntentos() == null ? 1 : curso.getIntentos();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nota", nota);
        out.put("estado", resultado.getEstado());
        out.put("minimo", curso.getNotaMinima());
        out.put("intentosUsados", resultado.getIntentosUsados());
        out.put("intentos", permitidos);
        return out;
    }

    @Transactional
    public void ingresarSala(Long cursoId, Authentication auth) {
        BusinessEmployee empleado = empleadoDelCurso(cursoId, auth);
        AulaCurso curso = cursoRepository.findById(cursoId).orElseThrow();
        exigirVigente(curso);
        if (curso.getSala() == null || curso.getSala().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esta capacitación no tiene reunión en vivo.");
        }
        AulaResultado propio = resultadoRepository.findByCursoIdAndEmployeeId(cursoId, empleado.getId()).orElse(null);
        if (propio != null && Boolean.TRUE.equals(propio.getIngresoSala())) return;
        if (propio == null) propio = nuevoResultado(curso, empleado);
        propio.setIngresoSala(true);
        resultadoRepository.save(propio);
    }

    @Transactional
    public void marcarVideo(Long cursoId, Authentication auth) {
        BusinessEmployee empleado = empleadoDelCurso(cursoId, auth);
        AulaCurso curso = cursoRepository.findById(cursoId).orElseThrow();
        exigirVigente(curso);
        AulaResultado resultado = resultadoRepository.findByCursoIdAndEmployeeId(cursoId, empleado.getId())
                .orElseGet(() -> nuevoResultado(curso, empleado));
        resultado.setVideoVisto(true);
        resultadoRepository.save(resultado);
    }

    @Transactional(readOnly = true)
    public AulaCurso archivo(Long businessId, Long cursoId, boolean video, Authentication auth) {
        if (esTrabajador(auth)) {
            empleadoDelCurso(cursoId, auth);
            exigirVigente(cursoDeEmpresa(businessId, cursoId));
        } else {
            assertGestiona(auth, businessId);
        }
        AulaCurso curso = cursoDeEmpresa(businessId, cursoId);
        if (video && (curso.getVideoPath() == null || curso.getVideoPath().isBlank())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este curso no tiene video.");
        }
        if (!video && (curso.getMaterialPath() == null || curso.getMaterialPath().isBlank())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este curso no tiene PDF.");
        }
        return curso;
    }

    private Map<String, Object> detalleAdmin(AulaCurso curso) {
        Map<String, Object> row = base(curso);
        List<Map<String, Object>> preguntas = new ArrayList<>();
        for (AulaPregunta pregunta : preguntaRepository.findByCursoIdOrderByOrdenAsc(curso.getId())) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("texto", pregunta.getTexto());
            List<String> opciones = new ArrayList<>();
            int correcta = 0;
            List<AulaOpcion> ops = opcionRepository.findByPreguntaIdOrderByOrdenAsc(pregunta.getId());
            for (int i = 0; i < ops.size(); i++) {
                opciones.add(ops.get(i).getTexto());
                if (Boolean.TRUE.equals(ops.get(i).getCorrecta())) correcta = i;
            }
            item.put("opciones", opciones);
            item.put("correcta", correcta);
            preguntas.add(item);
        }
        row.put("preguntas", preguntas);
        List<Map<String, Object>> resultados = new ArrayList<>();
        for (AulaResultado resultado : resultadoRepository.findByCursoId(curso.getId())) {
            employeeRepository.findById(resultado.getEmployeeId()).ifPresent(empleado -> {
                if (empleado.getBusiness() == null || !curso.getBusinessId().equals(empleado.getBusiness().getId())) return;
                Map<String, Object> persona = new LinkedHashMap<>();
                persona.put("nombre", empleado.getFullName());
                persona.put("cargo", empleado.getPosition());
                persona.put("nota", resultado.getNota());
                persona.put("enSala", Boolean.TRUE.equals(resultado.getIngresoSala()));
                persona.put("estado", estadoVisible(resultado.getEstado()));
                persona.put("fecha", resultado.getFecha() == null ? "—" : resultado.getFecha().toLocalDate().toString());
                resultados.add(persona);
            });
        }
        row.put("resultados", resultados);
        if (preguntas.size() > 1) {
            row.put("muestraMaria", textosDe(curso, "Maria Lopez"));
            row.put("muestraCarlos", textosDe(curso, "Carlos Mendoza"));
        }
        return row;
    }

    private Map<String, Object> vistaTrabajador(AulaCurso curso, BusinessEmployee empleado) {
        Map<String, Object> row = base(curso);
        row.put("businessName", empleado.getBusiness().getName());
        resultadoRepository.findByCursoIdAndEmployeeId(curso.getId(), empleado.getId()).ifPresent(resultado -> {
            row.put("nota", resultado.getNota());
            row.put("estado", estadoVisible(resultado.getEstado()));
            row.put("videoVisto", Boolean.TRUE.equals(resultado.getVideoVisto()));
        });
        if (!row.containsKey("estado")) row.put("estado", "Pendiente");
        return row;
    }

    private Map<String, Object> base(AulaCurso curso) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", curso.getId());
        row.put("businessId", curso.getBusinessId());
        row.put("titulo", curso.getTitulo());
        row.put("instructor", curso.getInstructor() == null ? "" : curso.getInstructor());
        row.put("area", curso.getArea());
        row.put("audiencia", curso.getAudiencia());
        row.put("audienciaDetalle", curso.getAudienciaDetalle());
        row.put("inicio", curso.getFechaInicio() == null ? (curso.getHoraReunion() == null ? "Por definir" : curso.getHoraReunion().toString()) : curso.getFechaInicio().toString());
        row.put("limite", curso.getHoraLimite() != null
                ? curso.getHoraLimite().toString().replace('T', ' ').substring(0, 16)
                : (curso.getFechaLimite() == null ? "Por definir" : curso.getFechaLimite().toString()));
        row.put("vencido", vencido(curso));
        row.put("hora", curso.getHoraReunion());
        row.put("cupo", curso.getCupo());
        row.put("modalidad", curso.getTipo() != null ? curso.getTipo() : (Boolean.TRUE.equals(curso.getEnVivo()) ? "vivo" : "video"));
        row.put("enVivo", Boolean.TRUE.equals(curso.getEnVivo()) || "charla".equals(curso.getTipo()));
        row.put("sala", curso.getSala() == null || curso.getSala().isBlank()
                ? null
                : "ImprovementSolutions" + curso.getBusinessId() + "c" + curso.getId());
        row.put("video", curso.getVideoNombre());
        row.put("tieneVideo", curso.getVideoPath() != null);
        row.put("material", curso.getMaterialNombre() == null ? "Sin presentación" : curso.getMaterialNombre());
        row.put("tienePdf", curso.getMaterialPath() != null);
        row.put("notaMinima", curso.getNotaMinima());
        row.put("intentos", curso.getIntentos());
        row.put("minutosEvaluacion", curso.getMinutosEvaluacion() == null ? 10 : curso.getMinutosEvaluacion());
        row.put("porTrabajador", curso.getPorTrabajador());
        row.put("duracion", Boolean.TRUE.equals(curso.getEnVivo()) && curso.getVideoPath() == null ? "En vivo, sin límite" : "5 min");
        row.put("estadoCurso", curso.getEstado());
        return row;
    }

    private void guardarPreguntas(Long cursoId, List<JsonNode> preguntas) {
        int orden = 0;
        for (JsonNode nodo : preguntas) {
            String texto = nodo.path("texto").asText("").trim();
            if (texto.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hay una pregunta vacía.");
            AulaPregunta pregunta = new AulaPregunta();
            pregunta.setCursoId(cursoId);
            pregunta.setTexto(texto);
            pregunta.setOrden(orden++);
            pregunta = preguntaRepository.save(pregunta);
            int correcta = nodo.path("correcta").asInt(0);
            int i = 0;
            if (nodo.path("opciones").isArray()) {
                for (JsonNode opcion : nodo.path("opciones")) {
                    String valor = opcion.asText("").trim();
                    if (valor.isBlank()) continue;
                    AulaOpcion fila = new AulaOpcion();
                    fila.setPreguntaId(pregunta.getId());
                    fila.setTexto(valor);
                    fila.setCorrecta(i == correcta);
                    fila.setOrden(i);
                    opcionRepository.save(fila);
                    i++;
                }
            }
            if (i < 2) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada pregunta necesita al menos dos opciones.");
        }
    }

    private String asignarPreguntas(AulaCurso curso, Long employeeId) {
        List<AulaPregunta> banco = preguntaRepository.findByCursoIdOrderByOrdenAsc(curso.getId());
        if (banco.isEmpty()) return null;
        int tomar = Math.min(curso.getPorTrabajador(), banco.size());
        Set<String> usadas = new HashSet<>();
        for (AulaResultado previo : resultadoRepository.findByCursoId(curso.getId())) {
            if (previo.getPreguntasJson() != null) usadas.add(firma(previo.getPreguntasJson()));
        }
        List<AulaPregunta> elegidas = null;
        Random random = new Random(Objects.hash(curso.getId(), employeeId));
        for (int intento = 0; intento < 40; intento++) {
            List<AulaPregunta> copia = new ArrayList<>(banco);
            Collections.shuffle(copia, random);
            List<AulaPregunta> candidato = new ArrayList<>(copia.subList(0, tomar));
            String firma = candidato.stream().map(p -> String.valueOf(p.getId())).sorted().reduce((a, b) -> a + "," + b).orElse("");
            if (!usadas.contains(firma)) {
                elegidas = candidato;
                break;
            }
            random = new Random(random.nextLong());
        }
        if (elegidas == null) {
            List<AulaPregunta> copia = new ArrayList<>(banco);
            Collections.shuffle(copia, random);
            elegidas = new ArrayList<>(copia.subList(0, tomar));
        }
        List<Map<String, Object>> payload = new ArrayList<>();
        for (AulaPregunta pregunta : elegidas) {
            List<AulaOpcion> opciones = new ArrayList<>(opcionRepository.findByPreguntaIdOrderByOrdenAsc(pregunta.getId()));
            Collections.shuffle(opciones, random);
            int correcta = 0;
            List<String> textos = new ArrayList<>();
            for (int i = 0; i < opciones.size(); i++) {
                textos.add(opciones.get(i).getTexto());
                if (Boolean.TRUE.equals(opciones.get(i).getCorrecta())) correcta = i;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", pregunta.getId());
            item.put("texto", pregunta.getTexto());
            item.put("opciones", textos);
            item.put("correcta", correcta);
            payload.add(item);
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo armar la evaluación.");
        }
    }

    private List<Map<String, Object>> preguntasSinRespuesta(String json) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (JsonNode nodo : readList(json)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("texto", nodo.path("texto").asText());
            List<String> opciones = new ArrayList<>();
            nodo.path("opciones").forEach(op -> opciones.add(op.asText()));
            item.put("opciones", opciones);
            out.add(item);
        }
        return out;
    }

    private List<String> textosDe(AulaCurso curso, String persona) {
        List<AulaPregunta> banco = preguntaRepository.findByCursoIdOrderByOrdenAsc(curso.getId());
        List<AulaPregunta> copia = new ArrayList<>(banco);
        Collections.shuffle(copia, new Random(persona.hashCode() + curso.getId()));
        int tomar = Math.min(curso.getPorTrabajador(), copia.size());
        List<String> textos = new ArrayList<>();
        for (int i = 0; i < tomar; i++) textos.add(copia.get(i).getTexto());
        return textos;
    }

    private String firma(String json) {
        List<String> ids = new ArrayList<>();
        for (JsonNode nodo : readList(json)) ids.add(nodo.path("id").asText());
        Collections.sort(ids);
        return String.join(",", ids);
    }

    private AulaResultado nuevoResultado(AulaCurso curso, BusinessEmployee empleado) {
        AulaResultado resultado = new AulaResultado();
        resultado.setCursoId(curso.getId());
        resultado.setEmployeeId(empleado.getId());
        resultado.setEstado("PENDIENTE");
        resultado.setVideoVisto(false);
        resultado.setIntentosUsados(0);
        return resultadoRepository.save(resultado);
    }

    private void validarAudiencia(Long businessId, String audiencia, String detalle) {
        if ("Todo el personal".equalsIgnoreCase(audiencia)) return;
        if (detalle.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica el departamento o el cargo de esta empresa.");
        }
        boolean existe = employeeRepository.findByBusinessId(businessId).stream().anyMatch(empleado -> {
            if ("Un departamento".equalsIgnoreCase(audiencia)) {
                return empleado.getDepartment() != null && detalle.equalsIgnoreCase(empleado.getDepartment().getName());
            }
            return detalle.equalsIgnoreCase(empleado.getPosition());
        });
        if (!existe) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "\"" + detalle + "\" no existe en esta empresa. No se guardó.");
        }
    }

    private boolean coincide(AulaCurso curso, BusinessEmployee empleado) {
        if ("Todo el personal".equalsIgnoreCase(curso.getAudiencia())) return true;
        String detalle = curso.getAudienciaDetalle() == null ? "" : curso.getAudienciaDetalle();
        if ("Un departamento".equalsIgnoreCase(curso.getAudiencia())) {
            return empleado.getDepartment() != null && detalle.equalsIgnoreCase(empleado.getDepartment().getName());
        }
        return detalle.equalsIgnoreCase(empleado.getPosition());
    }

    private BusinessEmployee empleadoDelCurso(Long cursoId, Authentication auth) {
        AulaCurso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Capacitación no encontrada."));
        return empleadosActivos(auth).stream()
                .filter(empleado -> empleado.getBusiness() != null && curso.getBusinessId().equals(empleado.getBusiness().getId()))
                .filter(empleado -> coincide(curso, empleado))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta capacitación no es de su empresa."));
    }

    private AulaCurso cursoDeEmpresa(Long businessId, Long cursoId) {
        AulaCurso curso = cursoRepository.findById(cursoId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Capacitación no encontrada."));
        if (!businessId.equals(curso.getBusinessId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta capacitación pertenece a otra empresa.");
        }
        return curso;
    }

    private void assertGestiona(Authentication auth, Long businessId) {
        User user = usuario(auth);
        boolean superAdmin = tiene(user, "ROLE_SUPER_ADMIN");
        if (superAdmin) return;
        boolean admin = tiene(user, "ROLE_ADMIN");
        boolean propia = user.getBusinesses() != null && user.getBusinesses().stream().anyMatch(b -> businessId.equals(b.getId()));
        if (!admin || !propia) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el administrador de esta empresa puede armar el aula.");
        }
    }

    private boolean esTrabajador(Authentication auth) {
        User user = usuario(auth);
        return tiene(user, "ROLE_EMPLOYEE") && !tiene(user, "ROLE_ADMIN") && !tiene(user, "ROLE_SUPER_ADMIN");
    }

    private List<BusinessEmployee> empleadosActivos(Authentication auth) {
        User user = usuario(auth);
        List<BusinessEmployee> records = employeeRepository.findAllByUserId(user.getId());
        if (records == null || records.isEmpty()) records = employeeRepository.findByCedula(user.getUsername());
        if (records == null || records.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró el trabajador de esta cuenta.");
        }
        return records.stream().filter(empleado -> !Boolean.FALSE.equals(empleado.getActive())).toList();
    }

    private User usuario(Authentication auth) {
        return userService.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión no válida."));
    }

    private boolean tiene(User user, String rol) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(r -> rol.equals(r.getName()));
    }

    private String guardar(Long businessId, MultipartFile file, String tipo) {
        String original = file.getOriginalFilename() == null ? tipo : file.getOriginalFilename();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.')) : "";
        String nombre = businessId + "-" + UUID.randomUUID() + ext;
        try {
            return storageService.store("aula", file, nombre);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo guardar el archivo.");
        }
    }

    private String estadoVisible(String estado) {
        if ("CUMPLIO".equals(estado)) return "Cumplió";
        if ("NO_ALCANZO".equals(estado)) return "No alcanzó";
        return "Pendiente";
    }

    private JsonNode read(String json) {
        try {
            return objectMapper.readTree(json == null ? "{}" : json);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Los datos de la capacitación no se pudieron leer.");
        }
    }

    private List<JsonNode> readList(String json) {
        List<JsonNode> list = new ArrayList<>();
        if (json == null || json.isBlank()) return list;
        try {
            objectMapper.readTree(json).forEach(list::add);
        } catch (Exception ignored) {
        }
        return list;
    }

    private String text(JsonNode node, String field) {
        return node.path(field).asText("").trim();
    }

    private LocalDate date(String value) {
        if (value == null || value.isBlank() || value.length() < 10) return null;
        try {
            return LocalDate.parse(value.substring(0, 10));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private boolean vencido(AulaCurso curso) {
        if (curso.getHoraLimite() != null) return LocalDateTime.now().isAfter(curso.getHoraLimite());
        return curso.getFechaLimite() != null && LocalDate.now().isAfter(curso.getFechaLimite());
    }

    private void exigirVigente(AulaCurso curso) {
        if (vencido(curso)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "La fecha límite ya se cumplió. Esta capacitación está bloqueada.");
        }
    }

    private LocalDateTime dateTime(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
