// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TuneGate is ReentrancyGuard {
    struct Track {
        string title;
        uint256 price;
        address payable artist;
    }

    Track[] private tracks;
    mapping(address fan => mapping(uint256 trackId => bool)) public hasAccess;

    event TrackAdded(uint256 indexed trackId, string title, uint256 price, address indexed artist);
    event TrackUnlocked(uint256 indexed trackId, address indexed fan, address indexed artist, uint256 price);

    constructor() {
        _addTrack("Monad Morning", 0.01 ether, payable(msg.sender));
        _addTrack("Glasswater", 0.02 ether, payable(msg.sender));
        _addTrack("Afterimage", 0.03 ether, payable(msg.sender));
    }

    function addTrack(string calldata title, uint256 price) external returns (uint256 trackId) {
        require(bytes(title).length > 0, "Title is required");
        require(price > 0, "Price must be greater than zero");

        trackId = tracks.length;
        tracks.push(Track(title, price, payable(msg.sender)));
        emit TrackAdded(trackId, title, price, msg.sender);
    }

    function trackCount() external view returns (uint256) {
        return tracks.length;
    }

    function getTrack(uint256 trackId)
        external
        view
        returns (uint256 id, string memory title, uint256 price, address artist)
    {
        Track storage track = tracks[trackId];
        return (trackId, track.title, track.price, track.artist);
    }

    function unlock(uint256 trackId) external payable nonReentrant {
        require(trackId < tracks.length, "Track does not exist");
        require(!hasAccess[msg.sender][trackId], "Track already unlocked");

        Track storage track = tracks[trackId];
        require(msg.value == track.price, "Send the exact track price");

        hasAccess[msg.sender][trackId] = true;
        (bool paid,) = track.artist.call{value: msg.value}("");
        require(paid, "Artist payment failed");

        emit TrackUnlocked(trackId, msg.sender, track.artist, msg.value);
    }

    function _addTrack(string memory title, uint256 price, address payable artist) private {
        uint256 trackId = tracks.length;
        tracks.push(Track(title, price, artist));
        emit TrackAdded(trackId, title, price, artist);
    }
}
