// The user data that would normally be in a database.
// For this example, we'll store it here, but the passwords will
// come from secure environment variables.
const users = {
  ivan_golosinda: {
    name: 'Ivan Golosinda',
    avatar: 'images/ivan.png',
    // The password will be injected from an environment variable
    password: process.env.USER_PASS_IVAN 
  },
  mildred_negranza: {
    name: 'Mildred Negranza',
    avatar: 'images/mildred.jpg',
    password: process.env.USER_PASS_MILDRED
  },
  greg_esperanzate: {
    name: 'Greg Esperanzate',
    avatar: 'images/greg.jpg',
    password: process.env.USER_PASS_GREG
  }
};

exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, password } = JSON.parse(event.body);
    const user = users[userId];

    // Check if the user exists and the password is correct
    if (user && user.password === password) {
      // SUCCESS: Send back user data but OMIT the password
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: {
            name: user.name,
            avatar: user.avatar
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        },
      };
    } else {
      // FAILURE: Send back a generic error message
      return {
        statusCode: 401, // Unauthorized
        body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
       headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
    };
  }
};
