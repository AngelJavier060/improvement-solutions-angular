import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import 'auth_service.dart';

class EmployeeDto {
  final int? id;
  final String? cedula;
  final String? nombres;
  final String? apellidos;
  final String? name;
  final String? imagePath;
  final String? image;
  final String? phone;
  final String? email;
  final String? position;
  final String? positionName;
  final String? departmentName;
  final String? area;
  final String? businessName;
  final String? contractorCompanyName;
  final bool? active;

  EmployeeDto({
    this.id,
    this.cedula,
    this.nombres,
    this.apellidos,
    this.name,
    this.imagePath,
    this.image,
    this.phone,
    this.email,
    this.position,
    this.positionName,
    this.departmentName,
    this.area,
    this.businessName,
    this.contractorCompanyName,
    this.active,
  });

  factory EmployeeDto.fromJson(Map<String, dynamic> json) {
    return EmployeeDto(
      id: json['id'] as int?,
      cedula: json['cedula'] as String?,
      nombres: json['nombres'] as String?,
      apellidos: json['apellidos'] as String?,
      name: json['name'] as String?,
      imagePath: json['imagePath'] as String?,
      image: json['image'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      position: json['position'] as String?,
      positionName: json['positionName'] as String?,
      departmentName: json['departmentName'] as String?,
      area: json['area'] as String?,
      businessName: json['businessName'] as String?,
      contractorCompanyName: json['contractorCompanyName'] as String?,
      active: json['active'] as bool?,
    );
  }

  String get fullName {
    if (apellidos != null && nombres != null && apellidos!.isNotEmpty && nombres!.isNotEmpty) {
      return '$apellidos $nombres';
    }
    return name ?? '';
  }

  String? get photoUrl {
    if (imagePath != null && imagePath!.isNotEmpty) {
      return '${AppConfig.baseUrl}/api/files/$imagePath';
    }
    return null;
  }
}

class EmployeeService {
  final AuthService _authService = AuthService();

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    if (_authService.token != null) 'Authorization': 'Bearer ${_authService.token}',
  };

  String? get _ruc => _authService.getPrimaryBusinessRuc();

  /// Search employees by name/apellido (for autocomplete)
  Future<List<EmployeeDto>> search(String term) async {
    if (_ruc == null || term.length < 2) return [];
    
    try {
      final url = '${AppConfig.baseUrl}/api/employee/$_ruc/ruc?search=$term';
      final response = await http.get(Uri.parse(url), headers: _headers);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final employees = data.map((e) => EmployeeDto.fromJson(e)).toList();
        
        // Filter by term in nombres or apellidos
        final termLower = term.toLowerCase();
        return employees.where((e) {
          final nombres = (e.nombres ?? '').toLowerCase();
          final apellidos = (e.apellidos ?? '').toLowerCase();
          final name = (e.name ?? '').toLowerCase();
          final cedula = (e.cedula ?? '').toLowerCase();
          return nombres.contains(termLower) || 
                 apellidos.contains(termLower) || 
                 name.contains(termLower) ||
                 cedula.contains(termLower);
        }).take(10).toList();
      }
      
      return [];
    } catch (e) {
      print('Error searching employees: $e');
      return [];
    }
  }

  /// Get employee by cedula
  Future<EmployeeDto?> getByCedula(String cedula) async {
    if (_ruc == null) return null;
    
    try {
      final url = '${AppConfig.baseUrl}/api/business-employees/company/$_ruc/cedula/$cedula';
      final response = await http.get(Uri.parse(url), headers: _headers);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return EmployeeDto.fromJson(data);
      }
      
      return null;
    } catch (e) {
      print('Error fetching employee by cedula $cedula: $e');
      return null;
    }
  }

  /// Get all employees for the business
  Future<List<EmployeeDto>> getAll() async {
    if (_ruc == null) return [];
    
    try {
      final url = '${AppConfig.baseUrl}/api/employee/$_ruc/ruc';
      final response = await http.get(Uri.parse(url), headers: _headers);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((e) => EmployeeDto.fromJson(e)).toList();
      }
      
      return [];
    } catch (e) {
      print('Error fetching all employees: $e');
      return [];
    }
  }
}
