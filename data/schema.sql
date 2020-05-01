  
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS meals CASCADE;




CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "firstname" VARCHAR(255),
  "lastname" VARCHAR(50),
  username VARCHAR(50) UNIQUE
);



CREATE TABLE metrics (
  id SERIAL PRIMARY KEY,
  age VARCHAR(255),
  height VARCHAR(255),
  sex VARCHAR(255),
  weight VARCHAR(255),
  getActivity VARCHAR(255),
  goal VARCHAR(255),
  loss VARCHAR(255),
  users_id INT NOT NULL,
  FOREIGN KEY (users_id) REFERENCES users (id)
);

CREATE TABLE meals (
  id SERIAL PRIMARY KEY,
  calories VARCHAR(255),
  protein VARCHAR(255),
  fat VARCHAR(255),
  carbohydrates VARCHAR(255),
  image VARCHAR(800),
  title VARCHAR(255),
  readyInMinutes VARCHAR(255),
  name VARCHAR(255),
  value VARCHAR(255),
  unit VARCHAR(255),
  users_id INT NOT NULL,
  FOREIGN KEY (users_id) REFERENCES users (id)
);

SELECT * FROM metrics JOIN users ON metrics.users_id = users.id;
SELECT * FROM meals JOIN users on meals.users_id = users.id;

