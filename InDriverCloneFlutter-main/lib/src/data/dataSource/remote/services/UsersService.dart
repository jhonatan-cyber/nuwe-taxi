import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:indriver_clone_flutter/src/data/api/ApiConfig.dart';
import 'package:indriver_clone_flutter/src/domain/models/user.dart';
import 'package:indriver_clone_flutter/src/domain/utils/ListToString.dart';
import 'package:indriver_clone_flutter/src/domain/utils/Resource.dart';
import 'dart:io';
import 'package:path/path.dart';

class UsersService {

  Future<String> token;

  UsersService(this.token);

  Future<Resource<User>> update(int id, User user) async {
    try {
      Uri url = ApiConfig.uri('/users/$id');
      Map<String, String> headers = await ApiConfig.authenticatedHeaders(token);
      String body = json.encode({
        'name': user.name,
        'lastname': user.lastname,
        'phone': user.phone,
      });
      final response = await http.put(url, headers: headers, body: body);
      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        User userResponse = User.fromJson(data);
        return Success(userResponse);
      }
      else {
        return ErrorData(listToString(data['message']));
      }
    } catch (e) {
      print('Error: $e');
      return ErrorData(e.toString());
    }
  }

  Future<Resource<User>> updateNotificationToken(int id, String notificationToken) async {
    try {
      Uri url = ApiConfig.uri('/users/notification_token/$id');
      Map<String, String> headers = await ApiConfig.authenticatedHeaders(token);
      String body = json.encode({
        'notification_token': notificationToken,
      });
      final response = await http.put(url, headers: headers, body: body);
      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        User userResponse = User.fromJson(data);
        return Success(userResponse);
      }
      else {
        print('ERROR ${listToString(data['message'])}');
        return ErrorData(listToString(data['message']));
      }
    } catch (e) {
      print('Error: $e');
      return ErrorData(e.toString());
    }
  }

  Future<Resource<User>> updateImage(int id, User user, File file) async { 
    try {
      Uri url = ApiConfig.uri('/users/upload/$id');
      final request = http.MultipartRequest('PUT', url);
      final accessToken = (await token).trim();
      if (accessToken.isEmpty) throw StateError('No hay una sesión autenticada');
      request.headers['Authorization'] = accessToken.startsWith('Bearer ')
          ? accessToken
          : 'Bearer $accessToken';
      request.files.add(http.MultipartFile(
        'file',
        http.ByteStream(file.openRead().cast()),
        await file.length(),
        filename: basename(file.path),
        contentType: MediaType('image', 'jpg')
      ));
      request.fields['name'] = user.name;
      request.fields['lastname'] = user.lastname;
      if (user.phone != null) request.fields['phone'] = user.phone!;
      final response = await request.send();
      final data = json.decode(await response.stream.transform(utf8.decoder).first);
      if (response.statusCode == 200 || response.statusCode == 201) {
        User userResponse = User.fromJson(data);
        return Success(userResponse);
      }
      else {
         return ErrorData(listToString(data['message']));
      }
    } catch (e) {
      print('Error: $e');
      return ErrorData(e.toString());
    }
  }

}