import { v4 as uuidv4 } from 'uuid';

export enum IntegrationType {
  API = 'api',
  WHITE_LABEL = 'white_label',
  MIDDLEWARE = 'middleware',
}

export enum AuthType {
  OAUTH2 = 'oauth2',
  HMAC = 'hmac',
  MTLS = 'mtls',
  NONE = 'none',
}

export interface BancaProps {
  id?: string;
  name: string;
  integrationType: IntegrationType;
  endpoint?: string;
  authType: AuthType;
  clientId?: string;
  secret?: string;
  publicKey?: string;
  slaMs?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Banca {
  readonly id: string;
  readonly name: string;
  readonly integrationType: IntegrationType;
  private _endpoint?: string;
  readonly authType: AuthType;
  private _clientId?: string;
  private _secret?: string;
  private _publicKey?: string;
  private _slaMs: number;
  private _isActive: boolean;
  readonly createdAt: Date;
  private _updatedAt: Date;

  constructor(props: BancaProps) {
    this.id = props.id || uuidv4();
    this.name = props.name;
    this.integrationType = props.integrationType;
    this._endpoint = props.endpoint;
    this.authType = props.authType;
    this._clientId = props.clientId;
    this._secret = props.secret;
    this._publicKey = props.publicKey;
    this._slaMs = props.slaMs || 5000;
    this._isActive = props.isActive !== undefined ? props.isActive : true;
    this.createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  get endpoint(): string | undefined {
    return this._endpoint;
  }

  get clientId(): string | undefined {
    return this._clientId;
  }

  get secret(): string | undefined {
    return this._secret;
  }

  get publicKey(): string | undefined {
    return this._publicKey;
  }

  get slaMs(): number {
    return this._slaMs;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateEndpoint(endpoint: string): void {
    this._endpoint = endpoint;
    this._updatedAt = new Date();
  }

  updateCredentials(clientId?: string, secret?: string, publicKey?: string): void {
    if (clientId) this._clientId = clientId;
    if (secret) this._secret = secret;
    if (publicKey) this._publicKey = publicKey;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      integrationType: this.integrationType,
      endpoint: this._endpoint,
      authType: this.authType,
      slaMs: this._slaMs,
      isActive: this._isActive,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
