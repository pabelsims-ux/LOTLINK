import { User, UserProps } from '../../src/domain/entities/user.entity';

describe('User Entity', () => {
  const createValidUserProps = (): UserProps => ({
    phone: '+18091234567',
    email: 'test@example.com',
    name: 'Test User',
  });

  describe('constructor', () => {
    it('should create a user with default wallet balance of 0', () => {
      const props = createValidUserProps();
      const user = new User(props);

      expect(user.id).toBeDefined();
      expect(user.phone).toBe(props.phone);
      expect(user.email).toBe(props.email);
      expect(user.name).toBe(props.name);
      expect(user.walletBalance).toBe(0);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should use provided initial wallet balance', () => {
      const props = { ...createValidUserProps(), walletBalance: 100 };
      const user = new User(props);

      expect(user.walletBalance).toBe(100);
    });
  });

  describe('chargeWallet', () => {
    it('should add amount to wallet balance', () => {
      const user = new User(createValidUserProps());
      
      user.chargeWallet(50);

      expect(user.walletBalance).toBe(50);
    });

    it('should accumulate multiple charges', () => {
      const user = new User(createValidUserProps());
      
      user.chargeWallet(50);
      user.chargeWallet(30);

      expect(user.walletBalance).toBe(80);
    });

    it('should throw error for non-positive amount', () => {
      const user = new User(createValidUserProps());

      expect(() => {
        user.chargeWallet(0);
      }).toThrow('Amount must be positive');

      expect(() => {
        user.chargeWallet(-10);
      }).toThrow('Amount must be positive');
    });
  });

  describe('debitWallet', () => {
    it('should debit amount from wallet balance', () => {
      const user = new User({ ...createValidUserProps(), walletBalance: 100 });
      
      user.debitWallet(30);

      expect(user.walletBalance).toBe(70);
    });

    it('should throw error for insufficient balance', () => {
      const user = new User({ ...createValidUserProps(), walletBalance: 20 });

      expect(() => {
        user.debitWallet(50);
      }).toThrow('Insufficient wallet balance');
    });

    it('should throw error for non-positive amount', () => {
      const user = new User({ ...createValidUserProps(), walletBalance: 100 });

      expect(() => {
        user.debitWallet(0);
      }).toThrow('Amount must be positive');
    });
  });

  describe('updateProfile', () => {
    it('should update name', () => {
      const user = new User(createValidUserProps());
      
      user.updateProfile('New Name');

      expect(user.name).toBe('New Name');
    });

    it('should update email', () => {
      const user = new User(createValidUserProps());
      
      user.updateProfile(undefined, 'new@example.com');

      expect(user.email).toBe('new@example.com');
    });

    it('should update both name and email', () => {
      const user = new User(createValidUserProps());
      
      user.updateProfile('New Name', 'new@example.com');

      expect(user.name).toBe('New Name');
      expect(user.email).toBe('new@example.com');
    });
  });

  describe('toJSON', () => {
    it('should return serializable object', () => {
      const user = new User(createValidUserProps());
      const json = user.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('phone');
      expect(json).toHaveProperty('email');
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('walletBalance');
      expect(json).toHaveProperty('createdAt');
    });
  });
});
