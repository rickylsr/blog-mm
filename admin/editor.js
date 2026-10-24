import CMS from '@sveltia/cms';
import { parse } from 'yaml';
import source from './config.yml?raw';

const config = parse(source);
config.load_config_file = false;
const authURL = import.meta.env.VITE_CMS_AUTH_URL;

if (authURL) {
  const url = new URL(authURL);
  if (url.protocol !== 'https:') {
    throw new Error('CMS 登录服务必须使用 HTTPS。');
  }
  config.backend.base_url = url.origin;
  config.backend.auth_methods = ['oauth', 'token'];
} else {
  // A fine-grained GitHub token works before an OAuth service is configured.
  // Never embed access tokens or OAuth client secrets in this client bundle.
  config.backend.auth_methods = ['token'];
}

CMS.init({ config });
