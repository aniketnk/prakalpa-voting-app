# prakalpa-voting-app
A simple web app, with the front-end developed using  Pure Vanilla js and back-end using Firebase Cloud Functions, to provide a voting infrastructure for Prakalpa, an annual showcasing of projects in PES University.

# Running

## Front-end server
Run a python http server by executing the following command in the `/frontend/` directory. \
``` python3 -m http.server ```

## Firebase cli installation
``` yarn global add firebase-tools ```

## Back-end server
To install dependencies, run the following command in the `/backend/functions/` directory. \
``` yarn ```

Run `firebase-login` to login to firebase inside the `/backend/` directory.

To run server locally, type the following command in the `/backend/` directory. \
``` firebase serve --only functions ```

To deploy cloud functions, type the following command in the `/backend/` directory. \
``` firebase serve --only functions ```

### Note
    Make sure a working internet connection exists.
