import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.entity';
import { PartnersService } from '../partners/partners.service';
import { PartnerType } from '../partners/partner.entity';
import { ProductsService } from '../products/products.service';
import { ProductType } from '../products/product.entity';
import { BomService } from '../bom/bom.service';

// Cria o usuário administrador inicial e, opcionalmente, dados de exemplo
// para uma fábrica de doces (insumos, produto acabado e ficha técnica) para
// facilitar os primeiros passos. Rode com `npm run seed`.
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const partnersService = app.get(PartnersService);
  const productsService = app.get(ProductsService);
  const bomService = app.get(BomService);

  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existingAdmin = await usersService.findByUsername(adminUsername);
  if (!existingAdmin) {
    await usersService.create({
      username: adminUsername,
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@sysvex.local',
      fullName: 'Administrador SYSVEX',
      password: adminPassword,
      role: UserRole.ADMIN,
    });
    // eslint-disable-next-line no-console
    console.log(`Usuário admin criado: ${adminUsername} / ${adminPassword} (troque a senha após o primeiro login).`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`Usuário admin "${adminUsername}" já existe, pulando criação.`);
  }

  if (process.env.SEED_SAMPLE_DATA !== 'false') {
    const supplier = await partnersService.create({
      name: 'Distribuidora de Insumos Doce Sabor Ltda',
      document: '12.345.678/0001-90',
      type: PartnerType.SUPPLIER,
      email: 'vendas@docesabor.example',
    });

    const customer = await partnersService.create({
      name: 'Mercadinho Bairro Feliz',
      document: '98.765.432/0001-10',
      type: PartnerType.CUSTOMER,
      email: 'compras@bairrofeliz.example',
    });

    const leiteCondensado = await productsService.create({
      sku: 'MP-001',
      name: 'Leite condensado (lata 395g)',
      type: ProductType.RAW_MATERIAL,
      unit: 'un',
      costPrice: 6.5,
      stockQty: 100,
      minStock: 20,
    });

    const chocolatePo = await productsService.create({
      sku: 'MP-002',
      name: 'Chocolate em pó (kg)',
      type: ProductType.RAW_MATERIAL,
      unit: 'kg',
      costPrice: 28.0,
      stockQty: 20,
      minStock: 5,
    });

    const manteiga = await productsService.create({
      sku: 'MP-003',
      name: 'Manteiga (kg)',
      type: ProductType.RAW_MATERIAL,
      unit: 'kg',
      costPrice: 32.0,
      stockQty: 10,
      minStock: 3,
    });

    const brigadeiro = await productsService.create({
      sku: 'PA-001',
      name: 'Brigadeiro gourmet (unidade)',
      type: ProductType.FINISHED_GOOD,
      unit: 'un',
      costPrice: 0,
      salePrice: 3.5,
      stockQty: 0,
      minStock: 50,
    });

    await bomService.create({ finishedProductId: brigadeiro.id, rawMaterialId: leiteCondensado.id, quantity: 0.1 });
    await bomService.create({ finishedProductId: brigadeiro.id, rawMaterialId: chocolatePo.id, quantity: 0.02 });
    await bomService.create({ finishedProductId: brigadeiro.id, rawMaterialId: manteiga.id, quantity: 0.01 });

    // eslint-disable-next-line no-console
    console.log(
      `Dados de exemplo criados: fornecedor "${supplier.name}", cliente "${customer.name}", 3 insumos e o produto "${brigadeiro.name}" com ficha técnica.`,
    );
  }

  await app.close();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Falha ao executar o seed:', err);
    process.exit(1);
  });
