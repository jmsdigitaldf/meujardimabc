import db from '../db.js';

async function addMoreBusLines() {
  console.log("Conectando ao banco de dados para adicionar a Linha 170 Barreiros e Micro-ônibus da Cooperativa...");

  try {
    // 1. Inserir Linha 170 Barreiros
    const res170 = await db.query(
      `INSERT INTO bus_routes (name, description, is_active) 
       VALUES ($1, $2, true) RETURNING id`,
      [
        '170 / 0.170 / 170.1 a 170.6 - Barreiros / DF-140 / Plano Piloto (Viação Barreiros)',
        'Linha com variantes 0.170, 170.1, 170.2, 170.4, 170.5, 170.6 atendendo Barreiros, condomínios da DF-140 e Jardim ABC até a Rodoviária do Plano Piloto.'
      ]
    );
    const id170 = res170.rows[0].id;
    console.log(`Linha 170 inserida com sucesso (ID: ${id170})`);

    // Horários da Linha 170
    const times170 = [
      { time: '05:15', note: 'Sentido Plano Piloto (170.1)' },
      { time: '05:45', note: 'Sentido Plano Piloto (170.2)' },
      { time: '06:10', note: 'Sentido Plano Piloto (0.170)' },
      { time: '06:25', note: 'Sentido Plano Piloto (170.4)' },
      { time: '07:30', note: 'Sentido Plano Piloto (170.1)' },
      { time: '12:00', note: 'Sentido Barreiros (170.5)' },
      { time: '17:00', note: 'Sentido Barreiros (0.170)' },
      { time: '17:35', note: 'Sentido Barreiros (170.1)' },
      { time: '18:30', note: 'Sentido Barreiros (170.6)' }
    ];

    for (const item of times170) {
      await db.query(
        "INSERT INTO bus_schedules (route_id, departure_time, notes) VALUES ($1, $2, $3)",
        [id170, item.time, item.note]
      );
    }
    console.log("  -> Horários da Linha 170 inseridos.");

    // 2. Inserir Micro-ônibus da Cooperativa
    const resCoop = await db.query(
      `INSERT INTO bus_routes (name, description, is_active) 
       VALUES ($1, $2, true) RETURNING id`,
      [
        'Micro-ônibus Cooperativa (Lotação Local Circular)',
        'Circulares da cooperativa local que rodam internamente no Jardim ABC e fazem a ligação direta com o centro de Cidade Ocidental.'
      ]
    );
    const idCoop = resCoop.rows[0].id;
    console.log(`Linha da Cooperativa inserida com sucesso (ID: ${idCoop})`);

    // Horários da Cooperativa (Intervalos circulares de 20 minutos)
    const timesCoop = [
      '06:00', '06:20', '06:40', '07:00', '07:20', '07:40', '08:00', '08:20', '08:40', '09:00',
      '10:00', '11:00', '12:00', '12:20', '12:40', '13:00', '13:20', '13:40', '14:00', '15:00',
      '16:00', '16:20', '16:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40', '19:00',
      '20:00', '21:00', '22:00'
    ];

    for (const time of timesCoop) {
      await db.query(
        "INSERT INTO bus_schedules (route_id, departure_time, notes) VALUES ($1, $2, $3)",
        [idCoop, time, 'Circular (Intervalo de 20 min nos picos)']
      );
    }
    console.log("  -> Horários da Cooperativa inseridos.");

    console.log("Adição concluída com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao adicionar ônibus:", err.message);
    process.exit(1);
  }
}

addMoreBusLines();
