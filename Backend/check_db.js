const axios = require('axios');

async function testLogin() {
    try {
        console.log("Attempting login via email...");
        const res = await axios.post('http://localhost:5001/api/login', {
            email: 'test@gmail.com',
            password: 'test' // assuming password is wrong, it should say Invalid password, not User not found
        });
        console.log("Success:", res.data);
    } catch (error) {
        console.log("Email Error:", error.response?.data || error.message);
    }

    try {
        console.log("Attempting login via phone...");
        const res = await axios.post('http://localhost:5001/api/login', {
            phone: '9335068357',
            password: 'test' 
        });
        console.log("Success:", res.data);
    } catch (error) {
        console.log("Phone Error:", error.response?.data || error.message);
    }
}

testLogin();
