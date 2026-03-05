import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ContactListAttributes {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  totalContacts: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContactListCreationAttributes extends Optional<ContactListAttributes, 'id' | 'description' | 'totalContacts'> {}

class ContactList extends Model<ContactListAttributes, ContactListCreationAttributes> implements ContactListAttributes {
  public id!: number;
  public userId!: number;
  public name!: string;
  public description!: string | null;
  public totalContacts!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ContactList.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    totalContacts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'contact_lists',
  }
);

export default ContactList;
