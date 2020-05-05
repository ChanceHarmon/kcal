'use strict';

require('dotenv').config();

const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
require('ejs');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT;

const client = new pg.Client(process.env.DATABASE_URL);

client.connect()
  .then(app.listen(PORT, () => console.log(`kCal is up on ${PORT}`)));

client.on('error', err => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));

app.use(methodOverride(function (request) {
  if (request.body && typeof request.body === 'object' && '_method' in request.body) {
    let method = request.body._method;
    delete request.body._method;
    return method;
  }
}));
app.set('view engine', 'ejs');

app.get('/', createJoke);
app.get('/about', aboutUs);

app.get('/', getLogIn);
app.get('/join', showForm);
app.post('/join', addUser);
app.post('/', allowIn);

app.post('/my-dashboard/:user_id', saveMetricsToDB);
app.put('/my-dashboard/:user_id', updateMetrics);
app.post('/saved-menus/:user_id', saveMealPlanToDB);
app.delete('/delete/:user_id', deleteMeal);

app.get('*', (request, response) => response.status(404).send('This route does not exist'));



function createJoke(request, response) {
  superagent.get('https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/food/jokes/random')
    .set('X-RapidAPI-Host', 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com')
    .set('X-RapidAPI-Key', `${process.env.X_RAPID_API_KEY}`)
    .then(apiResponse => {
      let joke = apiResponse.body.text
      response.render('pages/index', { joke: joke })
    })
    .catch(err => handleError(err, response))
}

function addUser(request, response) {
  let { firstname, lastname, username } = request.body;

  firstname = firstname.toLowerCase();
  lastname = lastname.toLowerCase();
  username = username.toLowerCase();

  let userExist = 'SELECT * FROM users WHERE username = $1;';
  let values1 = [username];

  client.query(userExist, values1)
    .then(results => {
      if (results.rows.length > 0) {
        response.render('pages/join');

      } else {
        let SQL = 'INSERT INTO users (firstname, lastname, username) VALUES ($1, $2, $3);';
        let values = [firstname, lastname, username];

        client.query(SQL, values)
          .then(() => {
            response.redirect('/');
          })
          .catch(error => handleError(error, response));
      }
    })
    .catch(error => handleError(error, response));
}

function showForm(request, response) {
  response.render('pages/join')
}

function getLogIn(request, response) {
  response.render('pages/index')
}

function allowIn(request, response) {
  let { username } = request.body;
  let checkForUser = 'SELECT * FROM users WHERE username = $1;';

  let value = [username];

  client.query(checkForUser, value)

    .then(results => {

      if (results.rowCount !== 0 && results.rows[0].username === username) {
        const user_id = results.rows[0].id;
        response.render('pages/intake-form', { user_id: user_id });
      } else {
        response.render('pages/join');
      }
    })
    .catch(error => handleError(error, response))
}

function aboutUs(request, response) {
  response.render('pages/about');
}



function getBmr(request) {
  let height = request.body.height;
  let weight = request.body.weight;
  let age = request.body.age;
  let sex = request.body.sex;
  let activity = request.body.getActivity;
  let loss = request.body.loss;

  let bmrWithoutActivity = 0;
  if (sex === 'male') {
    bmrWithoutActivity = (10 * (weight / 2.205) + 6.25 * (height * 2.54) - (5 * age) + 5);
  }
  else {
    bmrWithoutActivity = (10 * (weight / 2.205) + (6.25 * (height * 2.54)) - (5 * age) - 161);
  }
  let completeBmr = Math.floor(bmrWithoutActivity * activity);

  if (loss === 'mild') {
    return completeBmr - 215;
  }
  if (loss === 'moderate') {
    return completeBmr - 500;
  }
  if (loss === 'extreme') {
    return completeBmr - 1000;
  }
}

function goalDate(request) {
  let today = new Date();
  let loss = request.body.loss;
  let weight = request.body.weight;
  let goal = request.body.goal;

  if (loss === 'mild') {
    let weeks = ((weight - goal) / .5);
    let days = weeks * 7;
    today.setDate(today.getDate() + days);

    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var y = today.getFullYear();

    var formattedDate = mm + '/' + dd + '/' + y;
    return formattedDate;
  }
  if (loss === 'moderate') {
    let weeks = ((weight - goal) / 1);
    let days = weeks * 7;
    today.setDate(today.getDate() + days);

    dd = today.getDate();
    mm = today.getMonth() + 1;
    y = today.getFullYear();

    formattedDate = mm + '/' + dd + '/' + y;
    return formattedDate;
  }
  if (loss === 'extreme') {
    let weeks = ((weight - goal) / 2);
    let days = weeks * 7;
    today.setDate(today.getDate() + days);

    dd = today.getDate();
    mm = today.getMonth() + 1;
    y = today.getFullYear();

    formattedDate = mm + '/' + dd + '/' + y;
    return formattedDate;
  }
}


function Recipe(newRec) {

  this.name = newRec.name;
  this.value = newRec.amount.us.value;
  this.unit = newRec.amount.us.unit;
}

function Meal(newMeal) {
  const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
  this.id = newMeal.id ? newMeal.id : 'No id available';
  this.title = newMeal.title ? newMeal.title : 'No title available';
  this.readyInMinutes = newMeal.readyInMinutes ? newMeal.readyInMinutes : 'No info available';
  this.servings = newMeal.servings ? newMeal.servings : 'No info available';
  this.image = `https://spoonacular.com/recipeImages/${newMeal.image}` ? `https://spoonacular.com/recipeImages/${newMeal.id}-312x231.jpg` : placeholderImage;
}


function searchRecipe(data) {
  console.log('in recipe', data)
  let id = data.idArray;
  for (let i = 0; i < id.length; i++) {
    console.log(id[i])
    return superagent.get(`https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${id[i]}/ingredientWidget.json`)
      .set('X-RapidAPI-Host', 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com')
      .set('X-RapidAPI-Key', `${process.env.X_RAPID_API_KEY}`)

      .then(apiResponse => {
        console.log(apiResponse.body.ingredients)
        let ingredients = apiResponse.body.ingredients.map(recResult => new Recipe(recResult));
        console.log('226', ingredients)
        return [ingredients, data];
      })
  }
}

function searchNutrition(data) {
  let id = data.idArray;
  console.log('nutrition id', id);
  for (let i = 0; i < id.length; i++) {


    return superagent.get(`https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/${id[i]}/nutritionWidget.json`)
      .set('X-RapidAPI-Host', 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com')
      .set('X-RapidAPI-Key', `${process.env.X_RAPID_API_KEY}`)
      .then(apiResponse => {
        console.log('after nutrition call', data, apiResponse.body)
        return data
      })
  }
}

let searchNewMeals = function (request, response) {
  let metrics = request.body
  let calories = getBmr(request, response);
  let projDate = goalDate(request, response);
  let plan = request.body.loss;

  superagent.get(`https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/mealplans/generate?targetCalories=${calories}&timeFrame=day`)
    .set('X-RapidAPI-Host', 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com')
    .set('X-RapidAPI-Key', `${process.env.X_RAPID_API_KEY}`)

    .then(apiResponse => {
      let data = {};
      data.meals = apiResponse.body.meals.map(mealResult => new Meal(mealResult));
      data.nutrients = apiResponse.body.nutrients;
      data.idArray = data.meals.map((meal) => meal.id);
      console.log('data', data)
      return data;
    })
    // .then(result => {
    //   console.log(result)
    //   searchNutrition(result)
    // })
    .then(result => searchRecipe(result))
    .then(result => {
      console.log('resultresult')
      let userObj = result[1];
      userObj.ingredients = result[0];
      return userObj;
    })
    .then(result => {
      let { meals, nutrients, ingredients } = result;
      console.log('meals', meals, 'nutri', nutrients, 'ingredi', ingredients)
      response.render('pages/my-dashboard', { metrics: metrics, meals: meals, nutrients: nutrients, projDate: projDate, plan: plan, ingredients: ingredients, user_id: request.params.user_id })
    })
    .catch(err => handleError(err));
}



function saveMetricsToDB(request, response) {
  let user = request.params.user_id;
  //console.log(user)
  if (user) {
    return updateMetrics(request, response);
  } else {
    let { age, height, sex, weight, getActivity, goal, loss } = request.body;

    let SQL = 'INSERT INTO metrics (age, height, sex, weight, getActivity, goal, loss, users_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);';
    let values = [age, height, sex, weight, getActivity, goal, loss, request.params.user_id];

    return client.query(SQL, values)
      .then(searchNewMeals(request, response))
      .catch(err => handleError(err, response))
  }
}

function updateMetrics(request, response) {
  let { age, height, sex, weight, getActivity, goal, loss } = request.body;
  let SQL = `UPDATE metrics SET age=$1, height=$2, sex=$3, weight=$4, getActivity=$5, goal=$6, loss=$7 WHERE id=$8;`;
  let updates = [age, height, sex, weight, getActivity, goal, loss, request.params.user_id];
  client.query(SQL, updates)
    .then(searchNewMeals(request, response))
    .catch(err => handleError(err, response));
}

function saveMealPlanToDB(request, response) {

  // let { username } = request.body;
  // let checkForUser = 'SELECT * FROM users WHERE username = $1;';

  // let value = [username];

  // client.query(checkForUser, value)

  //   .then(results => {

  //     if (results.rowCount !== 0 && results.rows[0].username === username) {
  //       const user_id = results.rows[0].id;
  //       response.render('pages/intake-form', { user_id: user_id });
  //     } else {
  //       response.render('pages/join');
  //     }
  //   })
  //   .catch(error => handleError(error, response))



  let { calories, protein, fat, carbohydrates, image, title, readyInMinutes, name, value, unit } = request.body;
  //console.log(request.body)

  const SQL = 'INSERT INTO meals (calories, protein, fat, carbohydrates, image, title, readyInMinutes, name, value, unit, users_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);';
  const values = [calories, protein, fat, carbohydrates, image, title, readyInMinutes, name, value, unit, request.params.user_id];

  client.query(SQL, values)
    .then(() => {
      const SQL = 'SELECT * FROM meals';

      return client.query(SQL)
        .then(result => {
          let data = result.rows;
          response.render('pages/saved-menus', { result: data, plansSaved: result.rowCount, user_id: request.params.user_id })
        })
        .catch(error => handleError(error, response));
    })
    .catch(error => handleError(error, response));

}

function deleteMeal(request, response) {
  const SQL = 'DELETE FROM meals WHERE id=$1;';
  const value = [request.params.user_id];
  //console.log(SQL, value)
  client.query(SQL, value)
    .then(response.redirect('/saved-menus'))
    .catch(error => handleError(error, response));
}


function handleError(error, response) {
  console.log(error);
  console.log('response', response);
  response.render('pages/error', { error: error });
}
