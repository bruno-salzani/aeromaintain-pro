import { classifyCiv } from '../../services/civService.js';

export class CivClassifier {
  classify(natureza, aeronautas) {
    return classifyCiv(natureza, aeronautas);
  }
}
