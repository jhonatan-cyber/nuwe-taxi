CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE client_requests_status_enum AS ENUM (
    'CREATED',
    'ACCEPTED',
    'ON_THE_WAY',
    'ARRIVED',
    'TRAVELLING',
    'FINISHED',
    'CANCELLED'
);

CREATE TABLE roles (
    id varchar(255) PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    image varchar(255) NOT NULL,
    route varchar(255) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL,
    lastname varchar(255) NOT NULL,
    email varchar(255) NOT NULL UNIQUE,
    phone varchar(255) NOT NULL UNIQUE,
    image varchar(255),
    password varchar(255) NOT NULL,
    notification_token varchar(255),
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_has_roles (
    id_user integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_rol varchar(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (id_user, id_rol)
);

CREATE TABLE drivers_position (
    id_driver integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    position geography(Point, 4326) NOT NULL
);
CREATE INDEX drivers_position_position_gist ON drivers_position USING GIST (position);

CREATE TABLE driver_car_info (
    id_driver integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    brand varchar(255) NOT NULL,
    plate varchar(255) NOT NULL,
    color varchar(255) NOT NULL
);

CREATE TABLE client_requests (
    id serial PRIMARY KEY,
    id_client integer NOT NULL REFERENCES users(id),
    fare_offered numeric(10, 2) NOT NULL,
    pickup_description varchar(255) NOT NULL,
    destination_description varchar(255) NOT NULL,
    id_driver_assigned integer REFERENCES users(id),
    fare_assigned integer,
    client_rating numeric(5, 2),
    driver_rating numeric(5, 2),
    pickup_position geography(Point, 4326) NOT NULL,
    destination_position geography(Point, 4326) NOT NULL,
    status client_requests_status_enum NOT NULL DEFAULT 'CREATED',
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX client_requests_pickup_position_gist ON client_requests USING GIST (pickup_position);
CREATE INDEX client_requests_destination_position_gist ON client_requests USING GIST (destination_position);

CREATE TABLE driver_trip_offers (
    id serial PRIMARY KEY,
    id_driver integer NOT NULL REFERENCES users(id),
    id_client_request integer NOT NULL REFERENCES client_requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    fare_offered numeric(10, 2) NOT NULL,
    time numeric(10, 2) NOT NULL,
    distance numeric(10, 2) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE time_and_distance_values (
    id serial PRIMARY KEY,
    km_value numeric(10, 2) NOT NULL,
    min_value numeric(10, 2) NOT NULL
);