const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

const loginFilePath = path.join(__dirname, 'data', 'login.txt');
const petsFilePath = path.join(__dirname, 'data', 'available_pets.txt');

// Serve static files from the current directory (where your HTML files are located)
app.use(express.static(__dirname));

// Middleware to parse POST request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Setup session management
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for the registration page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// Handle the POST request for creating a new account
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Validate username and password format
    if (!/^[A-Za-z0-9]+$/.test(username) || !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,}$/.test(password)) {
        return res.status(400).send('Invalid username or password format');
    }

    // Check if the username already exists
    fs.readFile(loginFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading login file');
        }

        const users = data ? data.split('\n').filter(line => line) : [];
        const userExists = users.some(user => user.split(':')[0] === username);

        if (userExists) {
            return res.status(400).send('Username already exists');
        }

        // Append the new user to the login file
        fs.appendFile(loginFilePath, `${username}:${password}\n`, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error registering user');
            }
            res.send('Account created successfully!');
        });
    });
});

// Route for the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle the POST request for login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(loginFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading login file');
        }

        const users = data ? data.split('\n').filter(line => line) : [];
        const validUser = users.some(user => {
            const [storedUsername, storedPassword] = user.split(':');
            return storedUsername === username && storedPassword === password;
        });

        if (validUser) {
            req.session.loggedIn = true;
            req.session.username = username;
            res.redirect('/petgiveaway');
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

// Route for the 'Have a pet to give away' page
app.get('/petgiveaway', (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
        return;
    }
    res.sendFile(path.join(__dirname, 'petgiveaway.html'));
});

// Handle the POST request for pet registration
app.post('/petgiveaway', (req, res) => {
    if (!req.session.loggedIn) {
        res.redirect('/login');
        return;
    }

    const { petType, breed, age, gender } = req.body;

    fs.readFile(petsFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            res.status(500).send('Error reading pet file');
            return;
        }

        const lines = data ? data.split('\n').filter(line => line) : [];
        const lastLine = lines[lines.length - 1];
        const lastId = lastLine ? parseInt(lastLine.split(':')[0], 10) : 0;
        const newId = lastId + 1;

        const newEntry = `${newId}:${req.session.username}:${petType || 'undefined'}:${breed || 'undefined'}:${age || 'undefined'}:${gender || 'undefined'}`;

        fs.appendFile(petsFilePath, newEntry + '\n', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error saving pet data');
                return;
            }
            res.send('Pet registered successfully!');
        });
    });
});

// Route for the 'Find a pet' page
app.get('/findpet', (req, res) => {
    res.sendFile(path.join(__dirname, 'findpet.html'));
});

// Handle the POST request to search for pets
app.post('/findpet', (req, res) => {
    const { breed = '' } = req.body; // Default values to empty strings

    fs.readFile(petsFilePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            res.status(500).send('Error reading pet file');
            return;
        }

        const lines = data ? data.split('\n').filter(line => line) : [];
        console.log('All pet entries:', lines); // Log all entries

        const matchingPets = lines.filter(line => {
            const [id, username, type = '', petBreed = '', petAge = '', petGender = ''] = line.split(':');
            
            console.log(`Checking pet entry: ${line}`);
            console.log(`Comparing - breed: ${breed.trim().toLowerCase()}, petBreed: ${petBreed.trim().toLowerCase()}`);

            return breed.trim().toLowerCase() === petBreed.trim().toLowerCase();
        });

        console.log('Matching pets:', matchingPets); // Log matching entries

        let response = '<h2>Matching Pets</h2><ul>';
        if (matchingPets.length > 0) {
            matchingPets.forEach(pet => {
                const [id, username, type, petBreed, petAge, petGender] = pet.split(':');
                response += `<li>${type} - ${petBreed} - ${petAge} - ${petGender}</li>`;
            });
        } else {
            response += '<li>No matching pets found.</li>';
        }
        response += '</ul>';

        res.send(response);
    });
});

// Route for the 'Dog care' page
app.get('/dogcare', (req, res) => {
    res.sendFile(path.join(__dirname, 'dogcare.html'));
});

// Route for the 'Cat care' page
app.get('/catcare', (req, res) => {
    res.sendFile(path.join(__dirname, 'catcare.html'));
});

// Route for the 'Contact us' page
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

// Route for logging out
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error logging out');
        }
        res.send('You have been logged out successfully');
    });
});

// Start the server
const port = 3003;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
