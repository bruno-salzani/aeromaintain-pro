import dotenv from 'dotenv';
import { connectMongo } from './db/mongo.js';
import { Aircraft } from './models/aircraft.js';
import { Component } from './models/component.js';
import { Task } from './models/task.js';
import { ComplianceItem } from './models/complianceItem.js';

dotenv.config();

async function run() {
  await connectMongo(process.env.MONGODB_URI || 'mongodb://localhost:27017/aeromaintain');
  let aircraft = await Aircraft.findOne();
  if (!aircraft) {
    aircraft = await Aircraft.create({
      registration: 'PT-GAV',
      msn: '741',
      model: 'PILATUS PC12/47',
      manufactureYear: 2006,
      totalHours: 1710.3,
      totalCycles: 1398,
      nextIAMDate: '2019-02-27',
      validityCA: '2021-02-01',
      status: 'ATIVO'
    });
  }
  const compsCount = await Component.countDocuments();
  if (compsCount === 0) {
    await Component.create([
      {
        aircraftId: aircraft._id,
        pn: '129-1-1100-02',
        sn: '728',
        description: 'PITCH TRIM ACTUATOR',
        installedDate: '2015-01-01',
        installedHours: 1200,
        installedCycles: 900,
        lifeLimitHours: 500,
        remainingHours: -50,
        status: 'VENCIDO',
        ata: '27'
      },
      {
        aircraftId: aircraft._id,
        pn: '23085-025',
        sn: 'SG-102',
        description: 'STARTER - GENERATOR',
        installedDate: '2018-05-10',
        installedHours: 1600,
        installedCycles: 1300,
        remainingHours: 282,
        status: 'OK',
        ata: '24'
      },
      {
        aircraftId: aircraft._id,
        pn: '31406-002',
        sn: 'BAT-99',
        description: 'MAIN BATTERY NI-CAD',
        installedDate: '2018-08-15',
        installedHours: 1650,
        installedCycles: 1350,
        calendarLimitDays: 180,
        remainingDays: 180,
        status: 'OK',
        ata: '24'
      }
    ]);
  }
  const tasksCount = await Task.countDocuments();
  if (tasksCount === 0) {
    await Task.create([
      {
        aircraftId: aircraft._id,
        ata: '32',
        description: 'Aferição da Bússola',
        lastDoneDate: '2018-01-10',
        lastDoneHours: 1550,
        nextDueHours: 1710,
        isComplianceItem: false
      },
      {
        aircraftId: aircraft._id,
        ata: '35',
        description: 'Inspeção das máscaras de oxigênio',
        lastDoneDate: '2017-02-15',
        lastDoneHours: 1400,
        isComplianceItem: true
      },
      {
        aircraftId: aircraft._id,
        ata: '53',
        description: 'Inspeção do Front Pressure Bulkhead',
        lastDoneDate: '2018-06-20',
        lastDoneHours: 1620,
        nextDueDate: '2019-07-20',
        isComplianceItem: false
      }
    ]);
  }
  const compCount = await ComplianceItem.countDocuments();
  if (compCount === 0) {
    await ComplianceItem.create({
      type: 'DA',
      referenceNumber: '2019-02-01',
      description: 'Inspeção periódica do pitch trim actuator',
      applicableTo: 'Célula',
      ata: '27',
      effectiveDate: '2019-02-27',
      status: 'PENDENTE',
      nextDueHours: 1710
    });
  }
  process.exit(0);
}

run().catch(err => {
  process.exit(1);
});
