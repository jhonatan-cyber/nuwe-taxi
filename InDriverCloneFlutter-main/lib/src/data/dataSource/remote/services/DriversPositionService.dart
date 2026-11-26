import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:indriver_clone_flutter/src/data/api/ApiConfig.dart';
import 'package:indriver_clone_flutter/src/domain/models/DriverPosition.dart';
import 'package:indriver_clone_flutter/src/domain/utils/ListToString.dart';
import 'package:indriver_clone_flutter/src/domain/utils/Resource.dart';

class DriversPositionService {
   final Future<String> token;

   DriversPositionService(this.token);

   Future<Resource<bool>> create(DriverPosition driverPosition) async {

    try {
      Uri url = ApiConfig.uri('/drivers-position');
      Map<String, String> headers = await ApiConfig.authenticatedHeaders(token);
      String body = json.encode(driverPosition);
      final response = await http.post(url, headers: headers, body: body);
      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Success(true);
      }
      else {
        return ErrorData(listToString(data['message']));
      }
      
    } catch (e) {
      print('Error: $e');
      return ErrorData(e.toString());
    }

   }

   Future<Resource<DriverPosition>> getDriverPosition(int idDriver) async {

    try {
      Uri url = ApiConfig.uri('/drivers-position/${idDriver}');
      Map<String, String> headers = await ApiConfig.authenticatedHeaders(token);
      final response = await http.get(url, headers: headers);
      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        DriverPosition driverPosition = DriverPosition.fromJson(data);
        return Success(driverPosition);
      }
      else {
        return ErrorData(listToString(data['message']));
      }
      
    } catch (e) {
      print('Error: $e');
      return ErrorData(e.toString());
    }

   }

   Future<Resource<bool>> delete(int idDriver) async {

    try {
      Uri url = ApiConfig.uri('/drivers-position/${idDriver}');
      Map<String, String> headers = await ApiConfig.authenticatedHeaders(token);
      final response = await http.delete(url, headers: headers);
      final data = json.decode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return Success(true);
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