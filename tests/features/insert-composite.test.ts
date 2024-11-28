import { Collection, Entity, ManyToOne, MikroORM, OneToMany, PrimaryKeyProp, Property, ref, Ref } from '@mikro-orm/sqlite';

@Entity()
class Organisation {

  @Property({
    primary: true,
    type: 'integer',
    fieldName: 'org_id',
  })
  id!: number;

  @Property({ nullable: false })
  name!: string;

}

@Entity({ abstract: true })
abstract class Common {

  [PrimaryKeyProp]?: ['org', 'id'];

  @ManyToOne({
    primary: true,
    entity: () => Organisation,
    nullable: false,
    fieldName: 'org_id',
    deleteRule: 'cascade',
    ref: true,
  })
  org!: Ref<Organisation>;

  @Property({
    primary: true,
    type: 'integer',
  })
  id!: number;

}

@Entity()
class User extends Common {

  @Property({ nullable: false })
  name!: string;

  @OneToMany({
    entity: () => Form,
    mappedBy: 'owner',
    orphanRemoval: true,
  })
  forms = new Collection<Form>(this);

}

@Entity()
class Form extends Common {

  @Property()
  name!: string;

  @ManyToOne({
    entity: () => User,
    nullable: true,
    ref: true,
  })
  owner?: Ref<User>;

}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [User, Form],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });

  await orm.schema.refreshDatabase();

  const org = orm.em.create(Organisation, { id: 1, name: 'Test Org' });

  orm.em.create(User, {
    org,
    id: 2,
    name: 'John Doe',
  });

  await orm.em.flush();
});

afterAll(async () => {
  await orm.close(true);
});

test('Insert with relationship as ref()', async () => {
  const formInsert = orm.em.createQueryBuilder(Form).insert({
    org: ref(Organisation, 1),
    id: 3,
    name: 'Test Form 3',
    owner: ref(User, [1, 2]),
  });

  await formInsert.execute();
});

test('Insert with relationship as entity', async () => {
  const user = await orm.em.findOneOrFail(User, [1, 2]);

  const formInsert = orm.em.createQueryBuilder(Form).insert({
    org: ref(Organisation, 1),
    id: 4,
    name: 'Test Form 4',
    owner: user,
  });

  await formInsert.execute();
});

test('Insert with relationship as PK array', async () => {
  const formInsert = orm.em.createQueryBuilder(Form).insert({
    org: ref(Organisation, 1),
    id: 5,
    name: 'Test Form 5',
    owner: [1, 2],
  });
  await formInsert.execute();
});
