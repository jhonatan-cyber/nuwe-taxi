class ApiConfig {
  static const String API_BASE_URL = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://localhost:3000',
  );

  static Uri uri(String path) {
    final baseUri = Uri.parse(API_BASE_URL);
    if (baseUri.scheme != 'https') {
      throw StateError('API_BASE_URL debe usar HTTPS');
    }
    return baseUri.resolve(path);
  }

  static Future<Map<String, String>> authenticatedHeaders(Future<String> token) async {
    final accessToken = (await token).trim();
    if (accessToken.isEmpty) {
      throw StateError('No hay una sesión autenticada');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': accessToken.startsWith('Bearer ')
          ? accessToken
          : 'Bearer $accessToken',
    };
  }
}