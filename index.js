const express = require('express');
const cors = require('cors');
// *
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


// middle ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vtoj2.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function varifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorizes access.' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}


async function run() {
  try {
    await client.connect();

    const toolsCollection = client.db('colors_paint').collection('tools');

    const reviewCollection = client.db('colors_paint').collection('reviews');

    const userCollection = client.db('colors_paint').collection('users');

    const orderCollection = client.db('colors_paint').collection('orders');

    const productCollection = client.db('colors_paint').collection('tools');

    // get all users
    app.get('/user', varifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users)
    });

    // get use to check admin
    app.get('/admin/:email', async(req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin});
    })

    // make admin
    app.put('/user/admin/:email', varifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);

        res.send(result);
      }
      else{
        res.status(403).send({message: 'forbidden'})
      }

    })

    // store user *
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })

    // get all tools
    app.get('/tool', async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    // get tools after insert new tools ***********
    app.get('/products', async (req, res) => {

      const query = {};
      const cursor = productCollection.find(query)
      //   .project({ name: 1 });
      const products = await cursor.toArray();
      products.reverse();
      res.send(products);
    });




    // get a tool with id
    app.get('/tool/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const tool = await toolsCollection.findOne(query)
      res.send(tool);
    });

    // post a review 
    app.post('/reviews', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);

    });

    // get all reviews *
    app.get('/seereview', async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query)
      const review = await cursor.toArray();
      res.send(review);
    })

    // post order in database
    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // get order for a specific user
    app.get('/orders', varifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      }
      else {
        return res.status(403).send({ message: 'Forbidden access' });
      }
    });


    // delete order
    app.delete('/orders/:email', async (req, res) => {
      const email = req.params.email;
      const filter = {email: email};
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    // post new product in database
    app.post('/products', async (req, res) => {
      const order = req.body;
      const result = await productCollection.insertOne(order);
      res.send(result);
    });

    // get order for payment
    app.get('/order/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const order = await orderCollection.findOne(query);
      res.send(order);

    })

  }

  finally {

  }

}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello from colors paint tools Ltd!')
})

app.listen(port, () => {
  console.log(`Colors paint app listening on port ${port}`)
})