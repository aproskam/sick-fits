import 'dotenv/config';
import { createAuth } from '@keystone-next/auth';
import { config, createSchema } from '@keystone-next/keystone/schema';
import {
  withItemData,
  statelessSessions,
} from '@keystone-next/keystone/session';
import { CartItem } from './schemas/CartItem';
import { Order } from './schemas/Order';
import { OrderItem } from './schemas/OrderItem';
import { Product } from './schemas/Product';
import { ProductImage } from './schemas/ProductImage';
import { User } from './schemas/User';
import { Role } from './schemas/Role';
import { insertSeedData } from './seed-data';
import { sendPasswordResetEmail } from './lib/mail';
import { extendGraphqlSchema } from './mutations/index';
import { permissionsList } from './schemas/fields';

const dbURL =
  process.env.DATABASE_URL ||
  'mongodb://localhost/keystone-stick-fits-tutorial';

const sessionConfig = {
  maxAge: 60 * 60 * 24 * 360, // how long should the signed in
  secret: process.env.COOKIE_SECRET,
};

const { withAuth } = createAuth({
  listKey: 'User',
  identityField: 'email',
  secretField: 'password',
  initFirstItem: {
    fields: ['name', 'email', 'password'],
    //  TODO: change this for roles
  },
  passwordResetLink: {
    async sendToken(args) {
      console.log(args);
      // send the email
      await sendPasswordResetEmail(args.token, args.identity);
    },
  },
});

export default withAuth(
  config({
    server: {
      cors: {
        origin: [process.env.FRONTEND_URL],
        credentials: true,
      },
    },
    db: {
      adapter: 'mongoose',
      url: dbURL,
      // TODO: Add data seeding here
      async onConnect(keystone) {
        console.log('Connected to the DB');
        if (process.argv.includes('--seed-data')) {
          await insertSeedData(keystone);
        }
      },
    },
    lists: createSchema({
      // Schema items go in here
      User,
      Product,
      ProductImage,
      CartItem,
      Order,
      OrderItem,
      Role,
    }),
    extendGraphqlSchema,
    ui: {
      // Only show the ui only if you pass this test
      isAccessAllowed: ({ session }) => {
        console.log(session);
        return !!session?.data;
      },
    },
    session: withItemData(statelessSessions(sessionConfig), {
      // GraphQL query
      User: `id name email role { ${permissionsList.join(' ')} }`,
    }),
  })
);
