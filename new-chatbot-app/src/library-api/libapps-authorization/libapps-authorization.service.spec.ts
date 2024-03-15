import { Test, TestingModule } from '@nestjs/testing';
import { LibappsAuthorizationService } from './libapps-authorization.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { RetrieveEnvironmentVariablesService } from '../../shared/services/retrieve-environment-variables/retrieve-environment-variables.service';
import { BehaviorSubject, of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { LibraryApiModule } from '../library-api.module';
import { SharedModule } from '../../shared/shared.module';

describe('LibappsAuthorizationService', () => {
  let service: LibappsAuthorizationService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, LibraryApiModule, SharedModule],
      providers: [LibappsAuthorizationService],
    }).compile();

    service = module.get<LibappsAuthorizationService>(
      LibappsAuthorizationService,
    );
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reset token', (done) => {
    const token = 'newToken';
    jest
      .spyOn(httpService, 'post')
      .mockImplementation(() =>
        of({ data: { access_token: token } } as AxiosResponse),
      );

    const tokenObservable = service.getAccessTokenObservable();
    const tokenSubscription = tokenObservable.subscribe((newToken) => {
      expect(newToken).toEqual(token);
      tokenSubscription.unsubscribe();
      done();
    });

    service.resetToken();
  });

  it('should update token when resetToken is called', (done) => {
    const firstToken = 'firstToken';
    const secondToken = 'secondToken';

    jest
      .spyOn(httpService, 'post')
      .mockImplementationOnce(() =>
        of({ data: { access_token: firstToken } } as AxiosResponse),
      );

    const tokenObservable = service.getAccessTokenObservable();

    let counter = 1;
    const tokenSubscription = tokenObservable.subscribe((newToken) => {
      if (counter === 1) {
        counter++;
        expect(newToken).toEqual(firstToken);

        //New token
        jest
          .spyOn(httpService, 'post')
          .mockImplementationOnce(() =>
            of({ data: { access_token: secondToken } } as AxiosResponse),
          );
        service.resetToken(); // Calling resetToken again to trigger second token
      } else if (counter === 2) {
        expect(newToken).toEqual(secondToken);
        tokenSubscription.unsubscribe();
        done();
      }
    });

    service.resetToken();
  });
});
