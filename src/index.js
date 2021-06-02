const { ApolloServer, gql } = require('apollo-server');
const dotEnv = require('dotenv');
const { MongoClient, ObjectID } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
dotEnv.config();

const { DB_NAME, DB_URI, JWT_PRIVATE_KEY } = process.env;

const getUserFromToken = async (authorization, db) => {
  if (!authorization) {
    return null;
  }
  const decoded = authorization && jwt.verify(authorization, JWT_PRIVATE_KEY);

  if (!decoded?.data) {
    return null;
  }

  const user = await db.collection('Users').findOne({ _id: ObjectID(decoded.data) })

  return user;
};

const getToken = (user) => jwt.sign({
  data: user._id
}, JWT_PRIVATE_KEY, { expiresIn: '30 days' });


const typeDefs = gql`
  
  type Query {
    myTaskLists: [TaskList!]!
  }
  
  type Mutation {
    signIn (input: SignInInput): AuthUser!
    signUp (input: SignUpInput): AuthUser!
  }
  
  input SignInInput {
    email: String!
    password: String!
  }

  input SignUpInput {
    name: String!
    email: String!
    password: String!
    avatar: String
  }
  
  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
  }
  
  type AuthUser {
    user: User!
    token: String!
  }
  
  type TaskList {
    id: ID!
    createdAt: String!
    title: String!
    progres: Float!
    users: [User!]!
    todos: [ToDo!]!
  }
  
  type ToDo {
    id: ID!
    content: String!
    isComplete: Boolean!
    
#      taskListId: ID!
    taskList: TaskList
  }
`;

const resolvers = {
  Query: {
    myTaskLists: () => []
  },
  Mutation: {
    signIn: async (_, {input}, {db}) => {
      const user = await db.collection('Users').findOne({ email: input.email });
      const isPasswordCorrect = user && bcrypt.compareSync(input.password, user.password);

      if (!user || !isPasswordCorrect) {
        throw new Error('Invalid credentials!');
      }

      return {
        user,
        token: getToken(user)
      }
    },
    signUp: async (root, {input}, {db}) => {
      const hashedPassword = bcrypt.hashSync(input.password);
      const newUser = {
        ...input,
        password: hashedPassword
      };
      const result = await db.collection('Users').insert(newUser);
      const user = result.ops[0];

      return {
        user,
        token: getToken(user)
      }
    }
  },
  User: {
    id: (root) => root._id || root.id
  }
};


const start = async () => {
  const client = new MongoClient(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const user = await getUserFromToken(req.headers?.authorization, db);
      return {
        db,
        user
      }
    },
  });

  server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`);
  });
};

start().catch(e => console.error(e));
