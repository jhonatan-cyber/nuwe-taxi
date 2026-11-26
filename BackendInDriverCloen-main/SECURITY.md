# Configuración segura

- No reutilices las credenciales presentes en configuraciones locales antiguas. Revoca y rota la cuenta de servicio de Firebase, el secreto JWT, las credenciales de base de datos y las claves de Google Maps; revisa también su historial de Git y los registros de acceso.
- Copia `.env.example` a un gestor de secretos o a un `.env` local ignorado por Git. Genera un valor aleatorio de al menos 32 caracteres para `JWT_SECRET`; no uses el valor de ejemplo.
- Configura `DB_USERNAME` como una cuenta dedicada de privilegios mínimos. `synchronize` permanece desactivado; aplica cambios de esquema mediante migraciones revisadas.
- PostgreSQL requiere PostGIS para las columnas de ubicación; sigue `POSTGRES_MIGRATION.md` para inicializar el esquema y planificar el traspaso desde MySQL.
- Asigna una identidad de servicio de Google con permisos mínimos mediante Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` en desarrollo o identidad administrada en producción). Configura el bucket con `GCS_BUCKET_NAME`; nunca añadas el JSON de servicio al repositorio.
- Restringe `GOOGLE_MAPS_API_KEY` al servicio/IP y a las APIs necesarias. Configura TLS en el proxy de entrada y limita `CORS_ORIGINS` a los orígenes reales.
- Compila Flutter indicando el origen HTTPS, por ejemplo `flutter run --dart-define=API_BASE_URL=https://api.example.com`. No vuelvas a habilitar HTTP para producción.