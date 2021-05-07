const { ApolloServer, gql } = require('apollo-server');
const dotEnv = require('dotenv');
const { MongoClient } = require('mongodb');
dotEnv.config();

const { DB_NAME, DB_URI } = process.env;


const typeDefs = gql`
  
  type Query {
    myTaskLists: [TaskList!]!
  }
  
    type User {
      id: ID!
      name: String!
      email: String!
      avatar: String
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
  }
};

const start = async () => {
  const client = new MongoClient(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);

  const context = {
    db
  };

  const server = new ApolloServer({ typeDefs, resolvers, context });

  server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
};

start().catch(e => console.error(e));
