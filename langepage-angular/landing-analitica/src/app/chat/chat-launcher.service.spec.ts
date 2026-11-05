import { ChatLaunchRequest, ChatLauncherService } from './chat-launcher.service';

describe('ChatLauncherService', () => {
  it('emits open requests and trimmed questions, ignoring blank ones', () => {
    const launcher = new ChatLauncherService();
    const requests: ChatLaunchRequest[] = [];
    launcher.requests$.subscribe(request => requests.push(request));
    launcher.open();
    launcher.ask('  Qual o prazo?  ');
    launcher.ask('   ');
    expect(requests).toEqual([{ question: null }, { question: 'Qual o prazo?' }]);
  });
});
