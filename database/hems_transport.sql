CREATE DATABASE IF NOT EXISTS hems_transport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hems_transport;
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS payments, bookings, schedules, buses, drivers, routes, terminals, municipalities, users;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE users(
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(120) NOT NULL,
 email VARCHAR(160) NOT NULL UNIQUE,
 phone VARCHAR(30) NOT NULL,
 password VARCHAR(255) NOT NULL,
 address VARCHAR(255) NOT NULL,
 age INT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE municipalities(
 id INT AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL UNIQUE,
 province ENUM('Oriental Mindoro','Occidental Mindoro') NOT NULL,
 is_capital TINYINT(1) NOT NULL DEFAULT 0,
 manila_port VARCHAR(120) NOT NULL,
 routing_note VARCHAR(255) NOT NULL,
 display_order INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE terminals(
 id INT AUTO_INCREMENT PRIMARY KEY,
 terminal_name VARCHAR(100) NOT NULL UNIQUE,
 location VARCHAR(120) NOT NULL,
 address VARCHAR(255) NOT NULL,
 terminal_type ENUM('Manila','Mindoro') NOT NULL
) ENGINE=InnoDB;

CREATE TABLE routes(
 id INT AUTO_INCREMENT PRIMARY KEY,
 origin_terminal_id INT NOT NULL,
 destination_terminal_id INT NOT NULL,
 fare DECIMAL(10,2) NOT NULL,
 via_port VARCHAR(120) NOT NULL,
 FOREIGN KEY(origin_terminal_id) REFERENCES terminals(id),
 FOREIGN KEY(destination_terminal_id) REFERENCES terminals(id),
 UNIQUE KEY unique_route(origin_terminal_id,destination_terminal_id)
) ENGINE=InnoDB;

CREATE TABLE drivers(
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(120) NOT NULL,
 license_number VARCHAR(80) NOT NULL UNIQUE,
 contact_number VARCHAR(30) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE buses(
 id INT AUTO_INCREMENT PRIMARY KEY,
 bus_number VARCHAR(50) NOT NULL UNIQUE,
 plate_number VARCHAR(30) NOT NULL UNIQUE,
 driver_id INT NOT NULL,
 bus_type VARCHAR(80) NOT NULL,
 capacity INT NOT NULL,
 image VARCHAR(255) NULL,
 FOREIGN KEY(driver_id) REFERENCES drivers(id)
) ENGINE=InnoDB;

CREATE TABLE schedules(
 id INT AUTO_INCREMENT PRIMARY KEY,
 route_id INT NOT NULL,
 bus_id INT NOT NULL,
 travel_date DATE NOT NULL,
 departure_time TIME NOT NULL,
 arrival_time TIME NOT NULL,
 available_seats INT NOT NULL,
 FOREIGN KEY(route_id) REFERENCES routes(id),
 FOREIGN KEY(bus_id) REFERENCES buses(id),
 INDEX(travel_date)
) ENGINE=InnoDB;

CREATE TABLE bookings(
 id INT AUTO_INCREMENT PRIMARY KEY,
 booking_reference VARCHAR(40) NOT NULL UNIQUE,
 user_id INT NOT NULL,
 schedule_id INT NOT NULL,
 passenger_name VARCHAR(120) NOT NULL,
 passenger_address VARCHAR(255) NOT NULL,
 passenger_age INT NOT NULL,
 contact_number VARCHAR(30) NOT NULL,
 discount_type VARCHAR(40) NOT NULL,
 discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
 total_amount DECIMAL(10,2) NOT NULL,
 booking_status ENUM('CONFIRMED','CANCELLED','COMPLETED') DEFAULT 'CONFIRMED',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id),
 FOREIGN KEY(schedule_id) REFERENCES schedules(id)
) ENGINE=InnoDB;

CREATE TABLE payments(
 id INT AUTO_INCREMENT PRIMARY KEY,
 booking_id INT NOT NULL,
 payment_method ENUM('GCash','Credit Card') NOT NULL,
 amount DECIMAL(10,2) NOT NULL,
 payment_status ENUM('PENDING','PAID','FAILED') DEFAULT 'PENDING',
 transaction_reference VARCHAR(80) NOT NULL UNIQUE,
 account_name VARCHAR(120) NULL,
 account_number VARCHAR(40) NULL,
 cardholder_name VARCHAR(120) NULL,
 card_last4 VARCHAR(4) NULL,
 receipt_evidence VARCHAR(255) NULL,
 paid_at DATETIME NULL,
 FOREIGN KEY(booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB;

-- Route order supplied for the terminal list and booking selector.
-- Calapan Port sequence: Puerto Galera, San Teodoro, Baco, Calapan City,
-- Naujan, Victoria, Socorro, Pola, Pinamalayan, Gloria, Bansud,
-- Bongabong, Roxas, Mansalay, Bulalacao, San Jose, Magsaysay.
-- Abra de Ilog Port sequence: Abra de Ilog, Paluan, Mamburao, Looc,
-- Lubang, Santa Cruz, Sablayan, Calintaan, Rizal.
INSERT INTO municipalities(name,province,is_capital,manila_port,routing_note,display_order) VALUES
('Puerto Galera','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',1),
('San Teodoro','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',2),
('Baco','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',3),
('Calapan City','Oriental Mindoro',1,'Calapan Port','Via Calapan Port',4),
('Naujan','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',5),
('Victoria','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',6),
('Socorro','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',7),
('Pola','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',8),
('Pinamalayan','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',9),
('Gloria','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',10),
('Bansud','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',11),
('Bongabong','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',12),
('Roxas','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',13),
('Mansalay','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',14),
('Bulalacao','Oriental Mindoro',0,'Calapan Port','Via Calapan Port',15),
('San Jose','Occidental Mindoro',0,'Calapan Port','San Jose → Manila via Calapan Port',16),
('Magsaysay','Occidental Mindoro',0,'Calapan Port','Magsaysay → Manila via Calapan Port',17),
('Abra de Ilog','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',18),
('Paluan','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',19),
('Mamburao','Occidental Mindoro',1,'Abra de Ilog Port','Via Abra de Ilog Port',20),
('Looc','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',21),
('Lubang','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',22),
('Santa Cruz','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',23),
('Sablayan','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',24),
('Calintaan','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',25),
('Rizal','Occidental Mindoro',0,'Abra de Ilog Port','Via Abra de Ilog Port',26);

INSERT INTO terminals(terminal_name,location,address,terminal_type) VALUES
('PITX Terminal','Parañaque City, Metro Manila','PITX, Parañaque City, Metro Manila','Manila'),
('Buendia Terminal','Pasay City, Metro Manila','Buendia, Pasay City, Metro Manila','Manila');

INSERT INTO terminals(terminal_name,location,address,terminal_type)
SELECT CONCAT(name,' Terminal'), CONCAT(name,', ',province), CONCAT(name,', ',province), 'Mindoro'
FROM municipalities ORDER BY display_order;

-- Every Manila terminal connects to every Mindoro municipality.
INSERT INTO routes(origin_terminal_id,destination_terminal_id,fare,via_port)
SELECT mnl.id,t.id,
 CASE m.name WHEN 'Puerto Galera' THEN 950 WHEN 'Lubang' THEN 1150 WHEN 'San Jose' THEN 1050 WHEN 'Mamburao' THEN 1000 WHEN 'Sablayan' THEN 1050 ELSE 850 END,
 m.manila_port
FROM municipalities m
JOIN terminals t ON t.terminal_name=CONCAT(m.name,' Terminal')
JOIN terminals mnl ON mnl.terminal_type='Manila';

INSERT INTO routes(origin_terminal_id,destination_terminal_id,fare,via_port)
SELECT t.id,mnl.id,
 CASE m.name WHEN 'Puerto Galera' THEN 950 WHEN 'Lubang' THEN 1150 WHEN 'San Jose' THEN 1050 WHEN 'Mamburao' THEN 1000 WHEN 'Sablayan' THEN 1050 ELSE 850 END,
 m.manila_port
FROM municipalities m
JOIN terminals t ON t.terminal_name=CONCAT(m.name,' Terminal')
JOIN terminals mnl ON mnl.terminal_type='Manila';

INSERT INTO drivers(full_name,license_number,contact_number) VALUES
('Juan Dela Cruz','N01-123456','09171234567'),
('Pedro Santos','N01-223344','09181234567'),
('Marco Reyes','N01-334455','09191234567'),
('Jose Garcia','N01-445566','09201234567');

INSERT INTO buses(bus_number,plate_number,driver_id,bus_type,capacity,image) VALUES
('Hems Bus 101','ABC-1234',1,'Air-conditioned Bus',45,'/images/hems-bus-hero.png'),
('Hems Bus 102','ABC-5678',2,'Air-conditioned Bus',45,'/images/hems-bus-hero.png'),
('Hems Bus 103','XYZ-1122',3,'Air-conditioned Bus',45,'/images/hems-bus-hero.png'),
('Hems Bus 104','XYZ-3344',4,'Air-conditioned Bus',45,'/images/hems-bus-hero.png');

-- One daily schedule for every route for today and the next 30 days.
INSERT INTO schedules(route_id,bus_id,travel_date,departure_time,arrival_time,available_seats)
SELECT r.id, ((r.id-1)%4)+1, DATE_ADD(CURDATE(), INTERVAL d.day DAY),
 CASE WHEN MOD(r.id,4)=0 THEN '06:30:00' WHEN MOD(r.id,4)=1 THEN '08:00:00' WHEN MOD(r.id,4)=2 THEN '09:00:00' ELSE '07:30:00' END,
 CASE WHEN MOD(r.id,4)=0 THEN '14:30:00' WHEN MOD(r.id,4)=1 THEN '16:00:00' WHEN MOD(r.id,4)=2 THEN '17:00:00' ELSE '15:30:00' END,
 45
FROM routes r
CROSS JOIN (
 SELECT 0 day UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18
 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
) d;
