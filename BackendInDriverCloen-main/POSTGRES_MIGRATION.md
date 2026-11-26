# PostgreSQL y PostGIS

El backend usa PostgreSQL con la extensión PostGIS para guardar coordenadas y calcular distancias geográficas en metros. Se requiere una instalación de PostgreSQL que tenga PostGIS disponible.

## Base de datos nueva

1. Crea una base de datos PostgreSQL y una cuenta de aplicación con privilegios mínimos.
2. Ejecuta `database/postgres-schema.sql` contra esa base. La cuenta que ejecute el archivo debe poder habilitar PostGIS.
3. Copia `.env.example` a la configuración local y define `DB_HOST`, `DB_PORT=5432`, `DB_USERNAME`, `DB_PASSWORD` y `DB_DATABASE`.
4. Antes de aceptar registros, carga las filas de `roles` necesarias (al menos `CLIENT`) y los valores de `time_and_distance_values` que use la aplicación.

## Datos existentes en MySQL

El cambio de driver no convierte ni copia los datos existentes. Conserva una copia de seguridad de MySQL, crea el esquema PostgreSQL, exporta/importa las tablas respetando sus relaciones y reinicia las secuencias después de importar IDs explícitos. Verifica los usuarios, roles, solicitudes y ofertas antes de apuntar la API a PostgreSQL; no elimines ni sobrescribas la base MySQL hasta validar el traspaso.

Las coordenadas se insertaban históricamente como `POINT(latitud longitud)`, invirtiendo X/Y. El backend nuevo usa el orden correcto de PostGIS, `POINT(longitud latitud)`. Al migrar posiciones existentes, intercambia los ejes para preservar su ubicación real.