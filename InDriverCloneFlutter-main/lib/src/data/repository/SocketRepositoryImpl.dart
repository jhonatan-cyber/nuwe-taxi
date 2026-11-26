import 'package:indriver_clone_flutter/src/domain/repository/SocketRepository.dart';
import 'package:socket_io_client/src/socket.dart';

class SocketRepositoryImpl implements SocketRepository {

  Socket socket;
  Future<String> token;

  SocketRepositoryImpl(this.socket, this.token);

  @override
  Socket connect() {
    token.then((accessToken) {
      if (accessToken.isEmpty) return;
      final dynamic socketConnection = socket;
      socketConnection.auth = {
        'token': accessToken.replaceFirst(RegExp(r'^Bearer\s+'), ''),
      };
      socket.connect();
    });
    return socket;
  }

  @override
  Socket disconnect() {
    return socket.disconnect();
  }

}