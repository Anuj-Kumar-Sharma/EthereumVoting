pragma solidity ^0.4.22;

contract Election {

  address public admin;
  string public topic;
  uint public startTime;
  uint public endTime;
  struct Candidate {
    uint candidateId; // candidateId starts from index 1
    string name;
  }
  mapping(uint => uint) private voteCount;
  uint public candidatesCount;
  mapping(uint => Candidate) public candidates;
  struct Voter {
    address voterAddress;
    string name;
    bool voted;
    bool registered; // to check if this voter has registered
    uint candidateId;
  }
  uint private votersCount;
  mapping(address => Voter) private voters;

  constructor() public {
    admin = msg.sender;
    startTime = now;
    endTime = startTime + 5 minutes;
    topic = 'Who should be the Prime Minister(2019)?';
    candidates[1] = Candidate(1, 'Rahul Gandhi');
    candidates[2] = Candidate(2, 'Narendra Modi');
    candidates[3] = Candidate(3, 'Arvind Kejriwal');
    candidates[4] = Candidate(4, 'Akhilesh Yadav');
    candidatesCount = 4;
  }

  modifier adminOnly() {
    require(admin == msg.sender);
    _;
  }

  modifier registeredVotersOnly() {
    require(voters[msg.sender].registered);
    _;
  }

  modifier withinTimeLimit() {
    require(now < endTime);
    _;
  }

  modifier afterTimeLimit() {
    require(now > endTime);
    _;
  }

  event voterRegistered(address _voterAddress);

  event voteCasted(address _voterAddress);

  function isAdmin() public view returns(bool) {
    return (msg.sender == admin);
  }

  function isVoterRegistered() public view returns(bool) {
    return (voters[msg.sender].registered);
  }

  function getCurrentVoter() public view returns (address, string memory, bool, bool, uint) {
    Voter memory voter = voters[msg.sender];
    return(voter.voterAddress, voter.name, voter.voted, voter.registered, voter.candidateId);
  }

  function addVoter(string memory _name) public {
    votersCount++;
    voters[msg.sender] = Voter(msg.sender, _name, false, true, 0);
    emit voterRegistered(msg.sender);
  }

  // main voting function takes your selected candidate id and increments their vote count 
  function vote(uint _candidateId) public registeredVotersOnly withinTimeLimit{
    require(!voters[msg.sender].voted);
    voteCount[_candidateId]++;
    voters[msg.sender].voted = true;
    voters[msg.sender].candidateId = _candidateId;
    emit voteCasted(msg.sender);
  }

  function getVoteCountFor(uint _candidateId) public view afterTimeLimit returns(uint, string memory) {
    return (voteCount[_candidateId], candidates[_candidateId].name);
  }

  // returns (id, name, voteCount) of the winning candidate
  function getWinningCandidate() public view afterTimeLimit returns (uint, string memory, uint) {
    uint maxVote = 0;
    uint maxVoteCandidateId = 0;
    for(uint i = 0; i<candidatesCount; i++) {
      if(maxVote < voteCount[i]) {
        maxVote = voteCount[i];
        maxVoteCandidateId = i;
      }
    }  
    return (maxVoteCandidateId, candidates[maxVoteCandidateId].name, maxVote);
  }
}
