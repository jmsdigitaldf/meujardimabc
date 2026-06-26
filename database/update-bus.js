import db from '../db.js';

async function updateBusData() {
  console.log("Conectando ao banco de dados para atualizar linhas de ônibus...");

  try {
    // Limpar tabelas de ônibus existentes
    await db.query("DELETE FROM bus_schedules");
    await db.query("DELETE FROM bus_routes");
    console.log("Limpeza concluída.");

    // Inserir as linhas reais obtidas na pesquisa
    const routes = [
      {
        name: '8002 - Jardim ABC / Rodoviária do Plano Piloto (via Gilberto Salomão)',
        desc: 'Linha Jardim ABC para a Rodoviária do Plano Piloto via Lago Sul / comércio do Gilberto Salomão.'
      },
      {
        name: '8003 - Jardim ABC / Rodoviária do Plano Piloto (via L2 Sul / Esplanada)',
        desc: 'Linha Jardim ABC para a Rodoviária do Plano Piloto via L2 Sul e Esplanada dos Ministérios.'
      },
      {
        name: '8004 - Jardim ABC / W3 Sul (via QI 15 / Aeroporto)',
        desc: 'Linha Jardim ABC para a W3 Sul via QI 15 do Lago Sul e balão do Aeroporto.'
      },
      {
        name: '8015.1 - Jardim ABC / Rodoviária do Plano Piloto (via Ponte JK)',
        desc: 'Linha rápida Jardim ABC para a Rodoviária do Plano Piloto via Ponte JK.'
      },
      {
        name: '8076 - Jardim ABC / Cidade Ocidental (Integração)',
        desc: 'Linha de integração entre o Jardim ABC e o centro da Cidade Ocidental.'
      }
    ];

    const schedulesByRoute = {
      0: ['06:00', '06:40', '07:20', '08:00', '12:00', '13:30', '17:10', '18:30', '19:50'],
      1: ['06:15', '07:00', '08:30', '12:30', '14:00', '16:45', '17:45', '19:00'],
      2: ['05:50', '06:30', '07:15', '08:15', '11:45', '13:00', '17:30', '18:15'],
      3: ['06:10', '07:10', '08:20', '12:15', '13:45', '17:00', '18:00', '19:15'],
      4: ['05:30', '06:30', '07:30', '08:30', '10:30', '12:30', '14:30', '16:30', '17:30', '18:30', '19:30', '20:30']
    };

    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const res = await db.query(
        "INSERT INTO bus_routes (name, description, is_active) VALUES ($1, $2, true) RETURNING id",
        [r.name, r.desc]
      );
      const routeId = res.rows[0].id;
      console.log(`Linha inserida: ${r.name}`);

      const times = schedulesByRoute[i];
      for (const time of times) {
        await db.query(
          "INSERT INTO bus_schedules (route_id, departure_time, notes) VALUES ($1, $2, 'Segunda a Sexta')",
          [routeId, time]
        );
      }
      console.log(`  -> ${times.length} horários inseridos.`);
    }

    console.log("Atualização de linhas e horários de ônibus finalizada com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao atualizar ônibus:", err.message);
    process.exit(1);
  }
}

updateBusData();
