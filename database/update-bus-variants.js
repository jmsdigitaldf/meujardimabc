import db from '../db.js';

async function updateBusVariants() {
  console.log("Ajustando linhas de ônibus de acordo com a solicitação do usuário...");

  try {
    // Remover as linhas antigas que inserimos anteriormente para não duplicar
    await db.query("DELETE FROM bus_schedules WHERE route_id IN (SELECT id FROM bus_routes WHERE name LIKE '%170%' OR name LIKE '%Micro-ônibus%' OR name LIKE '%Cooperativa%')");
    await db.query("DELETE FROM bus_routes WHERE name LIKE '%170%' OR name LIKE '%Micro-ônibus%' OR name LIKE '%Cooperativa%'");
    console.log("Limpeza de duplicados concluída.");

    // Inserir linhas individuais das variantes 170 e a linha Micro-ônibus
    const routes = [
      { 
        name: '0.170 - Viação Barreiros', 
        desc: 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via DF-140 / Jardim Botânico).', 
        times: ['06:10', '17:00'] 
      },
      { 
        name: '170.1 - Viação Barreiros', 
        desc: 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via São Sebastião / Ponte Costa e Silva).', 
        times: ['05:15', '07:30', '17:35'] 
      },
      { 
        name: '170.2 - Viação Barreiros', 
        desc: 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via Ponte JK / L2 Sul).', 
        times: ['05:45', '18:00'] 
      },
      { 
        name: '170.4 - Viação Barreiros', 
        desc: 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via W3 Sul / Esplanada).', 
        times: ['06:25'] 
      },
      { 
        name: '170.5 - Viação Barreiros', 
        desc: 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via Lago Sul / Gilberto Salomão).', 
        times: ['12:00'] 
      },
      { 
        name: '170.6 - Viação Barreiros', 
        desc: 'Sentido de circulação: Barreiros / Rodoviária do Plano Piloto (Via Esplanada / L2 Norte).', 
        times: ['18:30'] 
      },
      {
        name: 'Micro-ônibus',
        desc: 'Sentido de circulação: Jardim ABC / Cidade Ocidental / Valparaíso / Novo Gama.',
        times: [
          '06:00', '06:20', '06:40', '07:00', '07:20', '07:40', '08:00', '08:20', '08:40', '09:00',
          '10:00', '11:00', '12:00', '12:20', '12:40', '13:00', '13:20', '13:40', '14:00', '15:00',
          '16:00', '16:20', '16:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40', '19:00',
          '20:00', '21:00', '22:00'
        ]
      }
    ];

    for (const r of routes) {
      const res = await db.query(
        "INSERT INTO bus_routes (name, description, is_active) VALUES ($1, $2, true) RETURNING id",
        [r.name, r.desc]
      );
      const routeId = res.rows[0].id;
      console.log(`Linha inserida: ${r.name}`);

      for (const time of r.times) {
        await db.query(
          "INSERT INTO bus_schedules (route_id, departure_time, notes) VALUES ($1, $2, 'Segunda a Sexta')",
          [routeId, time]
        );
      }
      console.log(`  -> ${r.times.length} horários inseridos.`);
    }

    console.log("Linhas de ônibus e variantes atualizadas com sucesso no Supabase!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao atualizar ônibus:", err.message);
    process.exit(1);
  }
}

updateBusVariants();
