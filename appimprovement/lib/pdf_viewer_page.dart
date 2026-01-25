import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:pdfx/pdfx.dart';

import 'services/auth_service.dart';

class PdfViewerPage extends StatefulWidget {
  final String url;
  const PdfViewerPage({super.key, required this.url});

  @override
  State<PdfViewerPage> createState() => _PdfViewerPageState();
}

class _PdfViewerPageState extends State<PdfViewerPage> {
  PdfControllerPinch? _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final token = AuthService().token;
      final resp = await http.get(
        Uri.parse(widget.url),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Accept': 'application/pdf',
        },
      );
      if (resp.statusCode != 200) {
        setState(() => _error = 'No se pudo abrir el PDF (HTTP ${resp.statusCode}).');
        return;
      }
      final bytes = resp.bodyBytes;
      setState(() {
        _controller = PdfControllerPinch(document: PdfDocument.openData(bytes));
      });
    } catch (e) {
      setState(() => _error = 'No se pudo cargar el documento.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documento PDF')),
      body: _error != null
          ? Center(child: Text(_error!))
          : (_controller == null)
              ? const Center(child: CircularProgressIndicator())
              : PdfViewPinch(controller: _controller!),
    );
  }
}
