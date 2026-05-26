import { Injectable } from '@nestjs/common';
import { CreateBancoDto } from './dto/create-banco.dto';
import { UpdatePreguntaDto } from './dto/update-pregunta.dto';
import { CreateBancoUseCase } from './use-cases/create-banco.use-case';
import { GetAllBancosUseCase } from './use-cases/get-all-bancos.use-case';
import { GetBancoUseCase } from './use-cases/get-banco.use-case';
import { UpdateBancoUseCase } from './use-cases/update-banco.use-case';
import { AddQuestionsUseCase } from './use-cases/add-questions.use-case';
import { UpdateQuestionUseCase } from './use-cases/update-question.use-case';

@Injectable()
export class BancosService {
  constructor(
    private readonly createBancoUseCase: CreateBancoUseCase,
    private readonly getAllBancosUseCase: GetAllBancosUseCase,
    private readonly getBancoUseCase: GetBancoUseCase,
    private readonly updateBancoUseCase: UpdateBancoUseCase,
    private readonly addQuestionsUseCase: AddQuestionsUseCase,
    private readonly updateQuestionUseCase: UpdateQuestionUseCase,
  ) {}

  async create(dto: CreateBancoDto) {
    return this.createBancoUseCase.execute(dto);
  }

  async crearPreguntas(bancoId: number, preguntas: any[]) {
    return this.addQuestionsUseCase.execute(bancoId, preguntas);
  }

  async findAll() {
    return this.getAllBancosUseCase.execute();
  }

  async findOne(id: number) {
    return this.getBancoUseCase.execute(id);
  }

  async update(id: number, dto: { nombre?: string; descripcion?: string }) {
    return this.updateBancoUseCase.execute(id, dto);
  }

  async updatePregunta(
    bancoId: number,
    preguntaId: number,
    dto: UpdatePreguntaDto,
  ) {
    return this.updateQuestionUseCase.execute(bancoId, preguntaId, dto);
  }
}
