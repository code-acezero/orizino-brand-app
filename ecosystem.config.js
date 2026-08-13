module.exports = {
  apps: [
    {
      name: "brandhome",
      script: "npm",
      args: "run start",
      cwd: "./apps/brandhome",
      env: {
        PORT: 3000
      }
    },
    {
      name: "storefront",
      script: "npm",
      args: "run start",
      cwd: "./apps/storefront",
      env: {
        PORT: 3001
      }
    },
    {
      name: "masterpanel",
      script: "npm",
      args: "run start",
      cwd: "./apps/masterpanel",
      env: {
        PORT: 3002
      }
    },
    {
      name: "orderops",
      script: "npm",
      args: "run start",
      cwd: "./apps/orderops",
      env: {
        PORT: 3003
      }
    }
  ]
};
