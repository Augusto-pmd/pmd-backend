const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

function extractPathFromRegexp(regexp) {
  if (!regexp || regexp.fast_slash) {
    return '';
  }
  const match = regexp.toString();
  let path = match
    .replace(/\^\\\//g, '/')
    .replace(/\\\/\(\?=\\\/\|\$\)/g, '')
    .replace(/\(\?=\\\/\|\$\)/g, '')
    .replace(/\$\//, '')
    .replace(/\\\\/g, '/')
    .replace(/\^/g, '')
    .replace(/\$/g, '')
    .replace(/\(\?:/g, '')
    .replace(/\)/g, '');
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return path;
}

async function main() {
  const app = await NestFactory.create(AppModule);
  await app.init();
  const server = app.getHttpAdapter().getHttpServer();
  const router = server._events?.request?._router || server._router;
  if (!router) {
    console.error('Router not found');
    process.exit(1);
  }
  const routes = [];
  const scan = (stack, prefix = '') => {
    stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const path = prefix + layer.route.path;
        Object.entries(layer.route.methods).forEach(([method, enabled]) => {
          if (enabled) {
            routes.push(method.toUpperCase() + ' ' + path);
          }
        });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const segment = extractPathFromRegexp(layer.regexp);
        scan(layer.handle.stack, prefix + segment);
      }
    });
  };
  scan(router.stack);
  routes.sort();
  console.log('--- Routes ---');
  routes.forEach((route) => console.log(route));
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
